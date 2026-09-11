import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service client for admin operations: bypasses Row Level Security.
 * Only in server-side code where admin privileges are required; NEVER exposed
 * to the browser.
 *
 * Prefers the modern secret key (`sb_secret_…`, SUPABASE_SECRET_KEY, rotatable
 * independently) and falls back to the legacy service_role JWT
 * (SUPABASE_SERVICE_ROLE_KEY). A publishable key cannot take this role: it
 * carries the anonymous privileges and stays under RLS.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) n'est pas définie");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
