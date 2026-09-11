import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, requireUser } from "@/lib/agents/auth";
import { resolveAssistContext, streamTextResponse, systemPromptFor } from "@/lib/ai/assist";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  rfpId: z.string().uuid(),
  supplierId: z.string().uuid().nullish(),
  field: z.enum(["comment", "question"]),
  text: z.string().trim().min(1, "Aucun texte à remettre en forme.").max(20_000),
});

/** POST /api/ai/rewrite — streams the rewritten text as plain text. */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const { rfpId, supplierId, field, text } = parsed.data;
    const resolved = await resolveAssistContext(supabase, user.id, rfpId, supplierId ?? null);
    if (resolved.error) return resolved.error;
    const { ctx } = resolved;

    return streamTextResponse({
      model: ctx.settings.rewrite_model_id,
      system: systemPromptFor("rewrite", ctx, field),
      user: [{ type: "text", text }],
      maxTokens: Math.min(8_000, Math.max(1_000, Math.ceil(text.length / 2))),
      timeoutMs: 55_000,
    });
  } catch (err) {
    return failure(err, "La remise en forme a échoué.");
  }
}
