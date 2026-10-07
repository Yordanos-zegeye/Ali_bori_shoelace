import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Detect whether valid Supabase configuration is present
export const isSupabaseConfigured = (): boolean => {
  return (
    !!rawUrl &&
    !!rawKey &&
    !rawUrl.includes('your-project-id') &&
    !rawKey.includes('your-anon-key')
  );
};

// Fallback placeholder credentials to prevent client initialization crashing
const supabaseUrl = isSupabaseConfigured() ? rawUrl : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured() ? rawKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
