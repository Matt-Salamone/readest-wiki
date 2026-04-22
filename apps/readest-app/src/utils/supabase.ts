import { createClient } from '@supabase/supabase-js';

// Prefer NEXT_PUBLIC_* so server-minted Storage URLs match the browser client (same project/host).
// If SUPABASE_URL is a private hostname and NEXT_PUBLIC is the public URL, reversing the order
// breaks signed uploads with "Invalid signature".
function decodeEnvB64(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  try {
    return atob(raw);
  } catch {
    return undefined;
  }
}

const supabaseUrl =
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
  process.env['SUPABASE_URL'] ||
  decodeEnvB64('NEXT_PUBLIC_DEFAULT_SUPABASE_URL_BASE64');
const supabaseAnonKey =
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
  process.env['SUPABASE_ANON_KEY'] ||
  decodeEnvB64('NEXT_PUBLIC_DEFAULT_SUPABASE_KEY_BASE64');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase URL or anon key: set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and/or NEXT_PUBLIC_DEFAULT_SUPABASE_*_BASE64 (see .env.tauri.example).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createSupabaseClient = (accessToken?: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });
};

export const createSupabaseAdminClient = () => {
  const supabaseAdminKey = process.env['SUPABASE_ADMIN_KEY'] || '';
  return createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
