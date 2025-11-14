import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser/client-side operations.
 * Uses the public anon key which is safe to expose in the browser.
 * Row Level Security (RLS) policies protect data access.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check .env.local",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
