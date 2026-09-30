import { supabase } from './supabase';

export const PROGRESS_PHOTO_BUCKET = 'progress-photos';

export type ProgressPhotoEntry = {
  id: string;
  measured_at: string;
  photo_path: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  measurements: Record<string, number>;
  created_at: string;
  imageUrl: string;
};

type ProgressPhotoRow = Omit<ProgressPhotoEntry, 'imageUrl'>;

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

async function signPhotoRows(rows: ProgressPhotoRow[]): Promise<ProgressPhotoEntry[]> {
  return Promise.all(rows.map(async row => {
    const { data, error } = await supabase.storage
      .from(PROGRESS_PHOTO_BUCKET)
      .createSignedUrl(row.photo_path, 60 * 60 * 24);
    if (error) throw error;
    return { ...row, measurements: row.measurements || {}, imageUrl: data.signedUrl };
  }));
}

async function fetchPhotoRows(userId: string, ascending: boolean, limit?: number) {
  let query = supabase
    .from('progress_entries')
    .select('id, measured_at, photo_path, weight_kg, body_fat_percent, measurements, created_at')
    .eq('user_id', userId)
    .order('measured_at', { ascending })
    .order('created_at', { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ProgressPhotoRow[];
}

export async function loadProgressPhotos() {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await fetchPhotoRows(userId, false);
  return signPhotoRows(rows);
}

export async function loadProgressPhotoHighlights() {
  const userId = await currentUserId();
  if (!userId) return [];
  const [firstRows, lastRows] = await Promise.all([
    fetchPhotoRows(userId, true, 1),
    fetchPhotoRows(userId, false, 1),
  ]);
  const rows = firstRows[0]?.id === lastRows[0]?.id
    ? firstRows
    : [...firstRows, ...lastRows];
  return signPhotoRows(rows);
}
