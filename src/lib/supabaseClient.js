import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[CoachMatch] VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY saknas i .env');
}

export const supabase = createClient(url ?? '', key ?? '');
