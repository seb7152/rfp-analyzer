import { NextRequest, NextResponse } from "next/server";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { creditsGuard } from "@/lib/agents/credits";
import { CompletionTimeoutError, OpenRouterError, streamChatCompletion } from "@/lib/agents/openrouter";
import { loadAiSettings } from "@/lib/ai/settings";
import { loadGlossaryTerms, vocabularyLine } from "@/lib/soutenance/glossary";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel refuses bodies above 4,5 Mo; WAV 16 kHz mono is 1,9 Mo per minute: two-minute pieces. */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const PROMPT = `Tu transcris un morceau de l'enregistrement d'une soutenance : la séance où une équipe d'évaluation reçoit un fournisseur pour clarifier son offre, dans le cadre de la consultation « {{consultation}} ». Le fournisseur reçu est {{fournisseur}} ; les autres noms à orthographier exactement sont : {{fournisseurs}}.

Tu rends mot pour mot ce qui est dit, en français si c'est dit en français, une ligne par prise de parole, chaque ligne au format « [mm:ss] Voix : texte » où mm:ss est le temps depuis le début de ce morceau et Voix distingue les personnes qui parlent (Intervenant A, Intervenant B, …, la même lettre pour la même voix dans tout le morceau). Tu retires seulement les hésitations et les faux départs ; tu ne résumes pas, tu ne complètes pas, tu n'ajoutes aucun commentaire. Un passage inaudible devient [inaudible].
{{vocabulaire}}

Réponds avec les lignes transcrites seules, sans introduction.`;

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/transcript/audio —
 * multipart: audio (WAV piece of two minutes at most). Returns the verbatim
 * lines of that piece; the browser assembles the pieces with their offsets
 * and loads the result as the séance's transcript.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const credits = await creditsGuard();
    if (credits) return credits;
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Formulaire illisible." }, { status: 400 });
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "Aucun morceau reçu." }, { status: 400 });
    if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Morceau trop long (4 Mo au plus)." }, { status: 413 });

    const [{ data: rfp }, { data: suppliers }] = await Promise.all([
      supabase.from("rfps").select("title, organization_id").eq("id", params.rfpId).maybeSingle(),
      supabase.from("suppliers").select("id, name").eq("rfp_id", params.rfpId),
    ]);
    if (!rfp) return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
    const [settings, terms] = await Promise.all([loadAiSettings(supabase, (rfp as { organization_id: string }).organization_id), loadGlossaryTerms(supabase, params.rfpId)]);
    const list = (suppliers ?? []) as Array<{ id: string; name: string }>;
    const current = list.find((s) => s.id === params.supplierId)?.name ?? "le fournisseur";
    const system = PROMPT.replace("{{consultation}}", (rfp as { title: string }).title)
      .replace("{{fournisseur}}", current)
      .replace("{{fournisseurs}}", list.map((s) => s.name).join(", ") || "aucun")
      .replace("{{vocabulaire}}", vocabularyLine(terms, settings.vocabulary))
      .replace(/\n{3,}/g, "\n\n");
    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
    try {
      const result = await streamChatCompletion({
        model: settings.transcription_model_id,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "input_audio", input_audio: { data, format: "wav" } }, { type: "text", text: "Transcris ce morceau." }] },
        ],
        reasoning: null,
        jsonSchema: null,
        maxTokens: 8_000,
        timeoutMs: 110_000,
      });
      return NextResponse.json({ text: result.content.trim(), cost: result.usage.cost });
    } catch (err) {
      if (err instanceof OpenRouterError) return NextResponse.json({ error: err.message }, { status: 502 });
      if (err instanceof CompletionTimeoutError) return NextResponse.json({ error: "La transcription de ce morceau a pris trop de temps." }, { status: 504 });
      throw err;
    }
  } catch (err) {
    return failure(err, "La transcription a échoué.");
  }
}
