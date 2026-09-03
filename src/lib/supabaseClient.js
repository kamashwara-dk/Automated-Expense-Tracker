import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-supabase-project-url.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-supabase-anon-key-here'
);

/**
 * Returns true only if the given id looks like a real Supabase UUID.
 * Guest/demo user IDs like "guest-user" or "demo-user-1234" are NOT UUIDs
 * and must never be sent to PostgreSQL uuid columns (causes error 22P02).
 */
export function isRealUserId(id) {
  if (!id || typeof id !== 'string') return false;
  // UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Use a globalThis singleton so hot-reloads in dev don't create multiple instances
// (which triggers a GoTrueClient "multiple instances" warning in the console).
const key = '__supabase_client__';
export const supabase =
  globalThis[key] ??
  (globalThis[key] = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,       // store session in localStorage so it survives refresh
        detectSessionInUrl: true,   // pick up OAuth/magic-link tokens from the URL
        autoRefreshToken: true,     // silently refresh expired JWTs
      },
    }
  ));
