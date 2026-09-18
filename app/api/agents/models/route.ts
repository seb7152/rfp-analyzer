import { NextResponse } from "next/server";
import { requireUser } from "@/lib/agents/auth";
import { DEFAULT_MODEL_ID, getCatalogue } from "@/lib/agents/openrouter";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/models — the OpenRouter catalogue, cached server-side a
 * few hours. When OpenRouter is unreachable the caller gets a 503 and keeps
 * the model already recorded.
 */
export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  try {
    const models = await getCatalogue();
    return NextResponse.json({ models, defaultModelId: DEFAULT_MODEL_ID });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Catalogue indisponible.", defaultModelId: DEFAULT_MODEL_ID },
      { status: 503 }
    );
  }
}
