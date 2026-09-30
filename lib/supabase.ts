import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://fbrzaijgsqkhnrywbwhh.supabase.co';
export const supabasePublishableKey = 'sb_publishable_j4a0ogaVHq22MMpfl3EijA__DtI9fdN';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
