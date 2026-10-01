import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from '../../../lib/supabaseConfig';

export const runtime = 'nodejs';

const BUCKET = 'progress-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const MEASUREMENT_KEYS = new Set([
  'neck', 'shoulders', 'chest', 'waist', 'hips', 'left_arm', 'right_arm',
  'left_forearm', 'right_forearm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf',
]);

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidDate(value: FormDataEntryValue | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return NextResponse.json({ error: 'Connecte-toi pour enregistrer une photo.' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Ta session a expiré. Reconnecte-toi puis réessaie.' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Le formulaire photo est illisible. Choisis à nouveau ta photo.' }, { status: 400 });
  }

  const photo = form.get('photo');
  const measuredAt = form.get('measured_at');
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'Choisis une photo avant d’enregistrer le repère.' }, { status: 400 });
  }
  const extension = ALLOWED_TYPES.get(photo.type);
  if (!extension) return NextResponse.json({ error: 'Choisis une image JPG, PNG ou WebP.' }, { status: 400 });
  if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'La photo doit faire 5 Mo ou moins.' }, { status: 413 });
  if (!isValidDate(measuredAt)) return NextResponse.json({ error: 'Choisis une date valide pour ce repère.' }, { status: 400 });

  const weight = optionalNumber(form.get('weight_kg'));
  const bodyFat = optionalNumber(form.get('body_fat_percent'));
  if (Number.isNaN(weight) || (weight !== null && (weight < 1 || weight > 500))) {
    return NextResponse.json({ error: 'Le poids doit être compris entre 1 et 500 kg.' }, { status: 400 });
  }
  if (Number.isNaN(bodyFat) || (bodyFat !== null && (bodyFat < 0 || bodyFat > 100))) {
    return NextResponse.json({ error: 'La masse grasse doit être comprise entre 0 et 100 %.' }, { status: 400 });
  }

  let measurements: Record<string, number>;
  try {
    const parsed: unknown = JSON.parse(String(form.get('measurements') || '{}'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error();
    measurements = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!MEASUREMENT_KEYS.has(key)) continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 1 || number > 300) throw new Error();
      measurements[key] = number;
    }
  } catch {
    return NextResponse.json({ error: 'Vérifie les mensurations saisies (de 1 à 300 cm).' }, { status: 400 });
  }

  const path = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, photo, {
    contentType: photo.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `L’envoi de la photo a échoué : ${uploadError.message}` }, { status: 502 });
  }

  const { error: rowError } = await supabase.from('progress_entries').insert({
    user_id: authData.user.id,
    photo_path: path,
    measured_at: measuredAt,
    weight_kg: weight,
    body_fat_percent: bodyFat,
    measurements,
  });
  if (rowError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: `La photo a été envoyée, mais le repère n’a pas été enregistré : ${rowError.message}` }, { status: 502 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}


export async function PATCH(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return NextResponse.json({ error: 'Connecte-toi pour modifier ce repère.' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Ta session a expiré. Reconnecte-toi puis réessaie.' }, { status: 401 });
  }

  let payload: { id?: unknown; weight_kg?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Les informations du repère sont illisibles.' }, { status: 400 });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id || !Object.prototype.hasOwnProperty.call(payload, 'weight_kg')) {
    return NextResponse.json({ error: 'Repère ou poids manquant.' }, { status: 400 });
  }
  const weight = payload.weight_kg === null
    ? null
    : typeof payload.weight_kg === 'number' ? payload.weight_kg : NaN;
  if (Number.isNaN(weight) || (weight !== null && (!Number.isFinite(weight) || weight < 1 || weight > 500))) {
    return NextResponse.json({ error: 'Le poids doit être compris entre 1 et 500 kg.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('progress_entries')
    .update({ weight_kg: weight })
    .eq('id', id)
    .eq('user_id', authData.user.id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Le poids n’a pas pu être enregistré.' }, { status: 502 });
  if (!data) return NextResponse.json({ error: 'Ce repère est introuvable.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
