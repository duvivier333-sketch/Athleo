'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Tab = 'discussion' | 'audit';
type Message = { id: string; from: 'coach' | 'user'; text: string };

type ApiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function CoachPage({ userName }: { userName: string }) {
  const [tab, setTab] = useState<Tab>('discussion');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Reconnecte-toi pour utiliser le Coach IA.');

        const response = await fetch('/api/coach', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Impossible de charger la discussion.');
        if (!active) return;

        setConversationId(payload.conversationId || null);
        const restored = ((payload.messages || []) as ApiMessage[]).map(item => ({
          id: item.id,
          from: item.role === 'assistant' ? 'coach' as const : 'user' as const,
          text: item.content,
        }));
        setMessages(restored);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger la discussion.');
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    void loadConversation();
    return () => { active = false; };
  }, []);

  async function send(text?: string) {
    const value = (text ?? message).trim();
    if (!value || sending) return;

    const optimisticId = `local-${Date.now()}`;
    setMessages(current => [...current, { id: optimisticId, from: 'user', text: value }]);
    setMessage('');
    setError('');
    setSending(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Reconnecte-toi pour utiliser le Coach IA.');

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: value, conversationId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.conversationId) setConversationId(payload.conversationId);
      if (!response.ok) throw new Error(payload.error || 'Le Coach IA n’a pas pu répondre.');

      const answer = payload.message as ApiMessage;
      setMessages(current => [...current, { id: answer.id, from: 'coach', text: answer.content }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Le Coach IA n’a pas pu répondre.');
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  const visibleMessages = messages.length > 0
    ? messages
    : [{ id: 'welcome', from: 'coach' as const, text: `Bonjour ${userName || ''}. Pose-moi une question sur ton entraînement, ta nutrition ou ta progression.` }];

  return (
    <div className="coach-page-view">
      <header className="coach-page-header">
        <p className="overline">TON ACCOMPAGNEMENT</p>
        <h1>Mon coach IA<span>.</span></h1>
        <p>Comprendre, faire le point, avancer.</p>
      </header>

      <section className="coach-audit-hero">
        <div>
          <p>TON POINT DE DÉPART</p>
          <h2>Un programme qui commence par toi.</h2>
          <span>Objectifs, rythme de vie et préférences.</span>
        </div>
        <button onClick={() => setTab('audit')}>Commencer mon audit</button>
      </section>

      <div className="coach-tabs" role="tablist" aria-label="Navigation coach">
        <button className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')}>Discussion</button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit</button>
      </div>

      {tab === 'discussion' ? (
        <section className="coach-conversation-card">
          <div className="coach-conversation-heading">
            <h2>Discuter avec ATHLEO</h2>
            <span className="coach-live-status"><i /> IA connectée</span>
          </div>
          <div className="coach-demo-note">Le Coach IA utilise ton historique Athleo et la base de connaissances configurée pour répondre de façon contextualisée.</div>

          <div className="coach-thread" aria-live="polite">
            {loadingHistory ? <div className="coach-message coach">Chargement de ta discussion…</div> : visibleMessages.map(item => (
              <div key={item.id} className={`coach-message ${item.from}`}>{item.text}</div>
            ))}
            {sending && <div className="coach-message coach coach-thinking">ATHLEO analyse tes données<span>…</span></div>}
          </div>

          {error && <div className="coach-error">{error}</div>}

          <div className="coach-suggestions">
            <button disabled={sending} onClick={() => void send('Fais-moi un bilan de ma progression récente')}>Faire mon bilan</button>
            <button disabled={sending} onClick={() => void send('Que dois-je vérifier si mes performances stagnent ?')}>Analyser une stagnation</button>
            <button disabled={sending} onClick={() => void send('Quelles données te manquent pour mieux personnaliser tes conseils ?')}>Améliorer mon suivi</button>
          </div>

          <form className="coach-composer" onSubmit={submit}>
            <input disabled={sending} value={message} onChange={e => setMessage(e.target.value)} placeholder="Pose ta question à ATHLEO…" maxLength={3000} />
            <button type="submit" disabled={sending || !message.trim()}>{sending ? 'Analyse…' : 'Envoyer'} <span>→</span></button>
          </form>
        </section>
      ) : (
        <section className="coach-audit-card">
          <div>
            <p className="overline">AUDIT ATHLEO</p>
            <h2>Construisons ton point de départ.</h2>
            <p>Cette étape permettra ensuite d’adapter l’entraînement, la nutrition et les repères à ton profil.</p>
          </div>
          <div className="coach-audit-grid">
            {[
              ['01', 'Objectif principal', 'Prise de masse, recomposition, perte de gras…'],
              ['02', 'Rythme de vie', 'Sommeil, emploi du temps et contraintes.'],
              ['03', 'Expérience', 'Niveau, historique et fréquence d’entraînement.'],
              ['04', 'Préférences', 'Exercices, alimentation et habitudes.'],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
          <button className="coach-start-audit">Démarrer l’audit <span>→</span></button>
        </section>
      )}
    </div>
  );
}
