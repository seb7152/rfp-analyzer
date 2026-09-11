import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { draftSystemPrompt } from "@/lib/agents/draft";
import { CompletionTimeoutError, OpenRouterError } from "@/lib/agents/openrouter";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().trim().max(120).default(""),
  description: z.string().trim().min(1, "Décrivez l'agent en une phrase d'abord.").max(500),
  current_prompt: z.string().max(20_000).optional(),
});

/**
 * POST /api/agents/draft-prompt — a draft of the system prompt from the
 * name and short description (organisation admins). Nothing is saved: the
 * caller puts the draft in the form and saves as usual.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const role = await orgRole(supabase, user.id, parsed.data.organization_id);
    if (role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });

    const draft = await draftSystemPrompt({
      name: parsed.data.name,
      description: parsed.data.description,
      currentPrompt: parsed.data.current_prompt,
    });
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof OpenRouterError) return NextResponse.json({ error: err.message }, { status: 502 });
    if (err instanceof CompletionTimeoutError) return NextResponse.json({ error: err.message }, { status: 504 });
    return failure(err, "La proposition n'a pas pu être générée.");
  }
}
