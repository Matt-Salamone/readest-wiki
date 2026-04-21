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

// #region agent log
fetch('http://127.0.0.1:7784/ingest/aa2f2faa-9fa8-4ae9-bac5-31fa9bb8e305', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3e2bda' },
  body: JSON.stringify({
    sessionId: '3e2bda',
    location: 'supabase.ts:module',
    message: 'supabase env resolution (no secrets)',
    data: {
      hasNextPublicUrl: Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']),
      hasSupabaseUrl: Boolean(process.env['SUPABASE_URL']),
      hasDefaultUrlB64: Boolean(process.env['NEXT_PUBLIC_DEFAULT_SUPABASE_URL_BASE64']),
      urlB64Len: process.env['NEXT_PUBLIC_DEFAULT_SUPABASE_URL_BASE64']?.length ?? 0,
      hasNextPublicKey: Boolean(process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']),
      hasSupabaseAnon: Boolean(process.env['SUPABASE_ANON_KEY']),
      hasDefaultKeyB64: Boolean(process.env['NEXT_PUBLIC_DEFAULT_SUPABASE_KEY_BASE64']),
      keyB64Len: process.env['NEXT_PUBLIC_DEFAULT_SUPABASE_KEY_BASE64']?.length ?? 0,
      resolvedHasUrl: Boolean(supabaseUrl),
      resolvedHasKey: Boolean(supabaseAnonKey),
    },
    timestamp: Date.now(),
    hypothesisId: 'A',
    runId: process.env['DEBUG_RUN_ID'] || 'post-fix',
  }),
}).catch(() => {});
// #endregion

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
