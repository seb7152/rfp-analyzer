import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";

type UserClient = Awaited<ReturnType<typeof createServerClient>>;

/** The signed-in user and their RLS-bound client, or a 401. */
export async function requireUser(): Promise<
  { supabase: UserClient; user: { id: string; email?: string }; error: null } | { supabase: null; user: null; error: NextResponse }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase: null, user: null, error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }
  return { supabase, user: { id: user.id, email: user.email }, error: null };
}

export async function orgRole(supabase: UserClient, userId: string, organizationId: string): Promise<"admin" | "evaluator" | "viewer" | null> {
  const { data } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data?.role as "admin" | "evaluator" | "viewer" | undefined) ?? null;
}

export type RfpAccess = "owner" | "evaluator" | "viewer" | "admin";

/** Access to a consultation, or the 404 / 403 to return. */
export async function requireRfpAccess(
  rfpId: string,
  userId: string,
  allowed: RfpAccess[]
): Promise<{ access: RfpAccess; error: null } | { access: null; error: NextResponse }> {
  const { hasAccess, accessLevel, error } = await checkRFPAccess(rfpId, userId);
  if (!hasAccess || !accessLevel) {
    const status = error?.includes("not found") ? 404 : 403;
    return { access: null, error: NextResponse.json({ error: status === 404 ? "Consultation introuvable." : "Accès refusé." }, { status }) };
  }
  if (!allowed.includes(accessLevel)) {
    return { access: null, error: NextResponse.json({ error: "Droits insuffisants sur cette consultation." }, { status: 403 }) };
  }
  return { access: accessLevel, error: null };
}

export const PILOT: RfpAccess[] = ["owner", "admin"];
export const EVALUATOR: RfpAccess[] = ["owner", "admin", "evaluator"];
export const READER: RfpAccess[] = ["owner", "admin", "evaluator", "viewer"];

export function failure(err: unknown, fallback = "Erreur interne."): NextResponse {
  const message = err instanceof Error ? err.message : fallback;
  console.error("[agents]", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
