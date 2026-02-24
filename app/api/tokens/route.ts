import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/pat/token";

/**
 * GET /api/tokens
 * List the current user's personal access tokens (without raw token value).
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokens, error } = await supabase
    .from("personal_access_tokens")
    .select("id, name, token_prefix, last_used_at, expires_at, created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tokens });
}

/**
 * POST /api/tokens
 * Create a new personal access token for the current user.
 * Returns the raw token once — it will never be shown again.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, expires_in_days } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Token name is required" },
      { status: 400 }
    );
  }

  const { raw, hash, prefix } = generateToken();

  const expires_at =
    expires_in_days != null
      ? new Date(Date.now() + expires_in_days * 86400_000).toISOString()
      : null;

  const { data: token, error } = await supabase
    .from("personal_access_tokens")
    .insert({
      user_id: user.id,
      name: name.trim(),
      token_hash: hash,
      token_prefix: prefix,
      expires_at,
    })
    .select("id, name, token_prefix, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    token: {
      ...token,
      // raw is returned ONCE — store it securely, it cannot be recovered
      raw,
    },
  });
}
