import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from '../../../lib/supabaseConfig';

export const runtime = 'nodejs';

const DEFAULT_MODEL = 'gpt-6-astra';
const MAX_MESSAGE_LENGTH = 3000;

type StoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type KnowledgeItem = {
  title: string;
  category: string;
  content: string;
  source: string | null;
  priority: number;
};

function authenticatedClient(accessToken: string) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function formatKnowledge(items: KnowledgeItem[]) {
  if (!items.length) return 'Aucun document Athleo spécifique ne correspond encore à cette question.';
  return items.map((item, index) => {
    const source = item.source ? ` — Source: ${item.source}` : '';
    return `[${index + 1}] ${item.category} / ${item.title}${source}\n${item.content}`;
  }).join('\n\n');
}

function formatProgress(entries: any[]) {
  if (!entries.length) return 'Aucun repère de progression enregistré.';
  return entries.map(entry => {
    const parts = [`date=${entry.measured_at}`];
    if (entry.weight_kg !== null) parts.push(`poids=${entry.weight_kg} kg`);
    if (entry.body_fat_percent !== null) parts.push(`masse_grasse=${entry.body_fat_percent}%`);
    const measurements = entry.measurements && typeof entry.measurements === 'object'
      ? Object.entries(entry.measurements).map(([key, value]) => `${key}=${value}cm`).join(', ')
      : '';
    if (measurements) parts.push(`mensurations: ${measurements}`);
    return `- ${parts.join(' | ')}`;
  }).join('\n');
}

function formatHistory(messages: StoredMessage[]) {
  return messages.map(item => `${item.role === 'assistant' ? 'ATHLEO' : 'UTILISATEUR'}: ${item.content}`).join('\n\n');
}

async function authenticate(request: Request) {
  const accessToken = bearerToken(request);
  if (!accessToken) return { error: NextResponse.json({ error: 'Connecte-toi pour utiliser le Coach IA.' }, { status: 401 }) };
  const supabase = authenticatedClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { error: NextResponse.json({ error: 'Ta session a expiré. Reconnecte-toi.' }, { status: 401 }) };
  return { accessToken, supabase, user: data.user };
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: conversation } = await supabase
    .from('coach_conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) return NextResponse.json({ conversationId: null, messages: [] });

  const { data: messages, error } = await supabase
    .from('coach_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversation.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(40);

  if (error) return NextResponse.json({ error: 'Impossible de charger la discussion.' }, { status: 500 });
  return NextResponse.json({ conversationId: conversation.id, messages: messages || [] });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  let body: { message?: string; conversationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Message invalide.' }, { status: 400 });
  }

  const message = String(body.message || '').trim();
  if (!message) return NextResponse.json({ error: 'Écris un message avant de l’envoyer.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: 'Ton message est trop long.' }, { status: 400 });

  let conversationId = body.conversationId || null;
  if (conversationId) {
    const { data: ownedConversation } = await supabase
      .from('coach_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!ownedConversation) conversationId = null;
  }

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from('coach_conversations')
      .insert({ user_id: user.id, title: message.slice(0, 72) })
      .select('id')
      .single();
    if (error || !created) return NextResponse.json({ error: 'Impossible de démarrer la discussion.' }, { status: 500 });
    conversationId = created.id;
  }

  const { error: userMessageError } = await supabase.from('coach_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content: message,
  });
  if (userMessageError) return NextResponse.json({ error: 'Impossible d’enregistrer ton message.' }, { status: 500 });

  const [historyResult, profileResult, progressResult, knowledgeResult] = await Promise.all([
    supabase
      .from('coach_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('progress_entries')
      .select('measured_at, weight_kg, body_fat_percent, measurements')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(8),
    supabase.rpc('search_coach_knowledge', { search_query: message, match_count: 6 }),
  ]);

  const history = ((historyResult.data || []) as StoredMessage[]).reverse();
  const profile = profileResult.data;
  const progress = progressResult.data || [];
  const knowledge = (knowledgeResult.data || []) as KnowledgeItem[];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: 'Le Coach IA est prêt, mais OPENAI_API_KEY doit être ajoutée dans les variables d’environnement Vercel.',
      conversationId,
    }, { status: 503 });
  }

  const instructions = `Tu es le Coach IA ATHLEO, un assistant de coaching sportif intégré à l’application Athleo.

Règles de fonctionnement :
- Réponds en français, de façon claire, concrète et structurée.
- Utilise en priorité les données réelles de l’utilisateur et les connaissances ATHLEO fournies ci-dessous.
- Ne prétends jamais connaître une donnée qui n’apparaît pas dans le contexte.
- Quand une information importante manque, dis précisément ce qu’il faut vérifier et pose au maximum deux questions ciblées.
- Distingue les faits issus des données de l’utilisateur, les règles ATHLEO et tes suggestions.
- Ne pose pas de diagnostic médical. Pour une douleur importante, une blessure suspectée ou un symptôme inhabituel, recommande un professionnel de santé qualifié.
- N’invente pas de séance, de charge, de calorie, de mensuration ou de progression.
- Garde une réponse généralement concise, mais suffisamment détaillée pour être actionnable.

Profil :
Prénom: ${profile?.first_name || 'non renseigné'}
Nom: ${profile?.last_name || 'non renseigné'}

Derniers repères de progression :
${formatProgress(progress)}

Base de connaissances ATHLEO pertinente :
${formatKnowledge(knowledge)}`;

  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions,
      input: `Voici l’historique récent de la discussion. Réponds au dernier message de l’utilisateur.\n\n${formatHistory(history)}`,
      max_output_tokens: 900,
      reasoning: { effort: 'low' },
    }),
  });

  const payload = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) {
    const detail = payload?.error?.message || 'Le modèle IA n’a pas pu répondre.';
    return NextResponse.json({ error: `Coach IA indisponible : ${detail}`, conversationId }, { status: 502 });
  }

  const answer = extractResponseText(payload);
  if (!answer) return NextResponse.json({ error: 'Le Coach IA a renvoyé une réponse vide.', conversationId }, { status: 502 });

  const { data: assistantMessage, error: assistantError } = await supabase
    .from('coach_messages')
    .insert({ conversation_id: conversationId, user_id: user.id, role: 'assistant', content: answer })
    .select('id, role, content, created_at')
    .single();

  if (assistantError || !assistantMessage) return NextResponse.json({ error: 'Réponse reçue mais impossible à enregistrer.', conversationId }, { status: 500 });

  await supabase
    .from('coach_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', user.id);

  return NextResponse.json({ conversationId, message: assistantMessage });
}
