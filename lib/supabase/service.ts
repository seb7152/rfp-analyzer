import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service client for admin operations.
 * Uses the service role key to bypass Row Level Security (RLS).
 * Should only be used in server-side code where admin privileges are required.
 * NEVER expose this client to the browser.
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
