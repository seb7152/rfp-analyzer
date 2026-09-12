import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { loadGranolaSettings } from "@/lib/connectors/granola-settings";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  organizationId: z.string().uuid(),
  personal_keys: z.boolean(),
  fetch_by: z.enum(["pilots", "evaluators"]),
});

/** PUT /api/connectors/granola/settings — the organisation's rules for the connector (admins). */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    const role = await orgRole(supabase, user.id, parsed.data.organizationId);
    if (role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });
    const { error: uError } = await supabase.from("organization_ai_settings").upsert(
      {
        organization_id: parsed.data.organizationId,
        granola_personal_keys: parsed.data.personal_keys,
        granola_fetch_by: parsed.data.fetch_by,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "organization_id" }
    );
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ settings: await loadGranolaSettings(supabase, parsed.data.organizationId) });
  } catch (err) {
    return failure(err);
  }
}
