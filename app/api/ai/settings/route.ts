import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { DEFAULT_AI_SETTINGS, loadAiSettings } from "@/lib/ai/settings";

export const dynamic = "force-dynamic";

/** GET /api/ai/settings?organizationId=… — the organisation's helper settings, defaults filled in. */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId est requis." }, { status: 400 });
    const role = await orgRole(supabase, user.id, organizationId);
    if (!role) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    const settings = await loadAiSettings(supabase, organizationId);
    return NextResponse.json({ settings, defaults: DEFAULT_AI_SETTINGS, role });
  } catch (err) {
    return failure(err);
  }
}

const putSchema = z.object({
  organization_id: z.string().uuid(),
  transcription_model_id: z.string().trim().max(200),
  transcription_prompt: z.string().trim().max(10_000),
  rewrite_model_id: z.string().trim().max(200),
  rewrite_prompt: z.string().trim().max(10_000),
  vocabulary: z.string().trim().max(5_000),
});

/** PUT /api/ai/settings — organisation admins; an empty value falls back to the default. */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const input = parsed.data;
    const role = await orgRole(supabase, user.id, input.organization_id);
    if (role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });

    const { error: upsertError } = await supabase.from("organization_ai_settings").upsert(
      {
        organization_id: input.organization_id,
        transcription_model_id: input.transcription_model_id || null,
        transcription_prompt: input.transcription_prompt || null,
        rewrite_model_id: input.rewrite_model_id || null,
        rewrite_prompt: input.rewrite_prompt || null,
        vocabulary: input.vocabulary,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "organization_id" }
    );
    if (upsertError) throw new Error(upsertError.message);
    const settings = await loadAiSettings(supabase, input.organization_id);
    return NextResponse.json({ settings, defaults: DEFAULT_AI_SETTINGS, role });
  } catch (err) {
    return failure(err);
  }
}
