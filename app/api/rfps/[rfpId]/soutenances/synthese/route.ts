import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveSuppliers, loadActiveVersion } from "@/lib/agents/context";
import { triggerWorker } from "@/lib/agents/worker";
import { ensureSystemAgent } from "@/lib/soutenance/agents";
import type { SoutenanceSyntheseRow, SyntheseData, SyntheseDomain } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/rfps/[rfpId]/soutenances/synthese — (re)generates the point de
 * synthèse of the active version: one job per retained supplier, run by the
 * agents' worker. Hand edits of the current synthèse are replaced.
 */
export async function POST(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    if (!process.env.OPENROUTER_API_KEY || !process.env.AGENT_WORKER_SECRET) {
      return NextResponse.json({ error: "La clé OpenRouter ou le secret du travailleur n'est pas configuré sur le serveur." }, { status: 503 });
    }
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    const suppliers = await loadActiveSuppliers(supabase, params.rfpId, version.id);
    if (suppliers.length === 0) return NextResponse.json({ error: "Aucun fournisseur dans cette version." }, { status: 409 });
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    const agent = await ensureSystemAgent((rfp as { organization_id: string }).organization_id, "synthese", user.id);

    const { data: existing } = await supabase.from("soutenance_syntheses").select("id, status").eq("rfp_id", params.rfpId).eq("version_id", version.id).maybeSingle();
    if (existing && (existing as { status: string }).status === "running") {
      return NextResponse.json({ error: "Une synthèse est déjà en cours de génération." }, { status: 409 });
    }
    const { data: row, error: sError } = await supabase
      .from("soutenance_syntheses")
      .upsert(
        { rfp_id: params.rfpId, version_id: version.id, status: "running", data: { suppliers: {} }, model_id: agent.model_id, error: null, generated_at: null, generated_by: user.id, cost: 0, prompt_tokens: 0, completion_tokens: 0 },
        { onConflict: "rfp_id,version_id" }
      )
      .select("*")
      .single();
    if (sError || !row) throw new Error(`Synthèse non créée : ${sError?.message ?? "inconnue"}`);
    const synthese = row as SoutenanceSyntheseRow;
    const { error: jError } = await supabase.from("ai_jobs").insert(
      suppliers.map((s) => ({
        rfp_id: params.rfpId,
        kind: "synthese",
        payload: { synthese_id: synthese.id, supplier_id: s.id, version_id: version.id },
        created_by: user.id,
      }))
    );
    if (jError) throw new Error(`Travaux non créés : ${jError.message}`);
    await triggerWorker(_request.nextUrl.origin);
    return NextResponse.json({ synthese, jobs: suppliers.length }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}

const itemSchema = z.object({ code: z.string().trim().max(60), text: z.string().trim().max(400) });
const patchSchema = z.object({
  supplier_id: z.string().uuid(),
  category_id: z.string().uuid(),
  forces: z.array(itemSchema).max(8),
  faiblesses: z.array(itemSchema).max(8),
  questions: z.array(itemSchema).max(5),
});

/** PATCH — a hand edit of one domain of one supplier (pilots). */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    const { data: row, error: rError } = await supabase.from("soutenance_syntheses").select("*").eq("rfp_id", params.rfpId).eq("version_id", version.id).maybeSingle();
    if (rError) throw new Error(rError.message);
    if (!row) return NextResponse.json({ error: "Aucune synthèse sur cette version." }, { status: 404 });
    const synthese = row as SoutenanceSyntheseRow;
    const data: SyntheseData = synthese.data?.suppliers ? synthese.data : { suppliers: {} };
    const supplier = data.suppliers[parsed.data.supplier_id] ?? { domains: {}, generated_at: null, edited_at: null };
    const domain: SyntheseDomain = {
      forces: parsed.data.forces.filter((i) => i.text),
      faiblesses: parsed.data.faiblesses.filter((i) => i.text),
      questions: parsed.data.questions.filter((i) => i.text),
    };
    const value = { ...supplier, domains: { ...supplier.domains, [parsed.data.category_id]: domain }, edited_at: new Date().toISOString() };
    const { error: uError } = await supabase.rpc("set_synthese_supplier", { p_synthese_id: synthese.id, p_supplier_id: parsed.data.supplier_id, p_value: value });
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ ok: true, supplier: value });
  } catch (err) {
    return failure(err);
  }
}
