import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { GranolaError, verifyKey } from "@/lib/connectors/granola";
import { loadGranolaSettings } from "@/lib/connectors/granola-settings";
import { deleteKey, storeKey, toInfo } from "@/lib/connectors/keys";
import { granolaStatus } from "@/lib/soutenance/api";

export const dynamic = "force-dynamic";

/** GET /api/connectors/granola?organizationId=… — the keys' presence and the settings. */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId est requis." }, { status: 400 });
    const role = await orgRole(supabase, user.id, organizationId);
    if (!role) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    const status = await granolaStatus(supabase, organizationId, user.id);
    return NextResponse.json({ ...status, role });
  } catch (err) {
    return failure(err);
  }
}

const putSchema = z.object({
  organizationId: z.string().uuid(),
  scope: z.enum(["organization", "personal"]),
  key: z.string().trim().min(8).max(400),
});

/**
 * PUT — stores a key after checking it against Granola: the organisation's
 * (admins) or the member's own (when the organisation allows it). The value
 * never comes back.
 */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
    const { organizationId, scope, key } = parsed.data;
    const role = await orgRole(supabase, user.id, organizationId);
    if (!role) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    if (scope === "organization" && role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });
    if (scope === "personal") {
      const settings = await loadGranolaSettings(supabase, organizationId);
      if (!settings.personal_keys) return NextResponse.json({ error: "Les clés personnelles ne sont pas autorisées dans cette organisation." }, { status: 403 });
    }
    let verified;
    try {
      verified = await verifyKey(key);
    } catch (err) {
      if (err instanceof GranolaError) return NextResponse.json({ error: err.message }, { status: err.status === 401 || err.status === 403 ? 400 : 502 });
      throw err;
    }
    const row = await storeKey("granola", organizationId, scope === "personal" ? user.id : null, key, user.id, { verified_at: new Date().toISOString(), verified_meta: verified });
    return NextResponse.json({ key: toInfo(row) });
  } catch (err) {
    return failure(err);
  }
}

/** DELETE ?organizationId&scope — removes a key. */
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const scope = request.nextUrl.searchParams.get("scope");
    if (!organizationId || (scope !== "organization" && scope !== "personal")) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    const role = await orgRole(supabase, user.id, organizationId);
    if (!role) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    if (scope === "organization" && role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });
    await deleteKey("granola", organizationId, scope === "personal" ? user.id : null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failure(err);
  }
}
