import { supabase } from './supabase';

export type PhaseType = 'recomposition' | 'bulk' | 'cut';

export type ProgressPhase = {
  id: string;
  user_id: string;
  phase_type: PhaseType;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
};

export type ProgressPhaseDraft = Pick<ProgressPhase, 'phase_type' | 'starts_on' | 'ends_on'>;

export async function loadProgressPhases(): Promise<ProgressPhase[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('progress_phases')
    .select('id, user_id, phase_type, starts_on, ends_on, created_at')
    .eq('user_id', auth.user.id)
    .order('starts_on', { ascending: true });
  if (error) throw error;
  return (data || []) as ProgressPhase[];
}

export async function saveProgressPhase(draft: ProgressPhaseDraft, id?: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Connecte-toi pour enregistrer une phase.');

  const query = id
    ? supabase.from('progress_phases').update(draft).eq('id', id).eq('user_id', auth.user.id)
    : supabase.from('progress_phases').insert({ ...draft, user_id: auth.user.id });
  const { data, error } = await query
    .select('id, user_id, phase_type, starts_on, ends_on, created_at')
    .single();
  if (error) throw error;
  return data as ProgressPhase;
}

export async function deleteProgressPhase(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Connecte-toi pour supprimer une phase.');

  const { error } = await supabase
    .from('progress_phases')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);
  if (error) throw error;
}
