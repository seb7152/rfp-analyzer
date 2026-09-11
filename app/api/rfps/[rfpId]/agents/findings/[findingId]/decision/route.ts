import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EVALUATOR, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { VERDICT_LABEL, type FindingQuote, type Verdict } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().max(1000).optional() }),
]);

function commentContent(f: {
  verdict: Verdict;
  proposed_score: number;
  justification: string;
  quotes: FindingQuote[];
  questions: string[];
  risks: string[];
}): string {
  const parts: string[] = [];
  parts.push(`Verdict : ${VERDICT_LABEL[f.verdict]} — note proposée ${String(f.proposed_score).replace(".", ",")}/5.`);
  if (f.justification) parts.push(f.justification);
  const verified = f.quotes.filter((q) => q.verified);
  const unverified = f.quotes.filter((q) => !q.verified);
  if (verified.length > 0) parts.push(`Extraits de la réponse :\n${verified.map((q) => `« ${q.text} »`).join("\n")}`);
  if (unverified.length > 0) parts.push(`Extraits non retrouvés dans la réponse :\n${unverified.map((q) => `« ${q.text} »`).join("\n")}`);
  if (f.questions.length > 0) parts.push(`Questions au fournisseur :\n${f.questions.map((q) => `- ${q}`).join("\n")}`);
  if (f.risks.length > 0) parts.push(`Risques :\n${f.risks.map((r) => `- ${r}`).join("\n")}`);
  return parts.join("\n\n");
}

/**
 * POST /api/rfps/[rfpId]/agents/findings/[findingId]/decision
 * Accept: the proposed score becomes the AI score, the justification the AI
 * comment, a discussion thread is opened with the full proposal, signed by
 * the evaluator and linked to the proposal; peer review, when enabled, goes
 * back to "submitted". Reject: the rejection and its optional reason.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string; findingId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, EVALUATOR);
    if (access.error) return access.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Action invalide." }, { status: 400 });

    const { data: finding, error: fError } = await supabase
      .from("agent_findings")
      .select("*, agent_runs!inner(rfp_id, version_id), responses!inner(id, rfp_id, requirement_id)")
      .eq("id", params.findingId)
      .eq("agent_runs.rfp_id", params.rfpId)
      .maybeSingle();
    if (fError) throw new Error(fError.message);
    if (!finding) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
    if (finding.status !== "proposed") {
      return NextResponse.json({ error: "Cette proposition a déjà été décidée." }, { status: 409 });
    }
    const now = new Date().toISOString();

    if (parsed.data.action === "reject") {
      const { data: updated, error: uError } = await supabase
        .from("agent_findings")
        .update({ status: "rejected", decided_by: user.id, decided_at: now, rejection_reason: parsed.data.reason || null })
        .eq("id", finding.id)
        .select("*")
        .single();
      if (uError) throw new Error(uError.message);
      return NextResponse.json({ finding: updated });
    }

    // 1. The score and comment the AI now carries.
    const { error: rError } = await supabase
      .from("responses")
      .update({ ai_score: finding.proposed_score, ai_comment: finding.justification, last_modified_by: user.id, updated_at: now })
      .eq("id", finding.response_id);
    if (rError) throw new Error(`Note non écrite : ${rError.message}`);

    // 2. The discussion thread, signed by the evaluator, linked to the proposal.
    const { data: thread, error: tError } = await supabase
      .from("response_threads")
      .insert({ response_id: finding.response_id, title: "Proposition d'agent acceptée", priority: "normal", status: "open", created_by: user.id })
      .select("id")
      .single();
    if (tError || !thread) throw new Error(`Fil non créé : ${tError?.message}`);
    const { error: cError } = await supabase.from("thread_comments").insert({
      thread_id: thread.id,
      content: commentContent(finding),
      author_id: user.id,
      agent_finding_id: finding.id,
    });
    if (cError) throw new Error(`Commentaire non créé : ${cError.message}`);

    // 3. Peer review: back to "submitted" so a reviewer looks at it again.
    const { data: rfp } = await supabase.from("rfps").select("peer_review_enabled").eq("id", params.rfpId).maybeSingle();
    if (rfp?.peer_review_enabled) {
      const { error: prError } = await supabase.from("requirement_review_status").upsert(
        {
          requirement_id: finding.responses.requirement_id,
          version_id: finding.agent_runs.version_id,
          status: "submitted",
          submitted_by: user.id,
          submitted_at: now,
          reviewed_by: null,
          reviewed_at: null,
          rejection_comment: null,
          updated_at: now,
        },
        { onConflict: "requirement_id,version_id" }
      );
      if (prError) throw new Error(`Relecture non demandée : ${prError.message}`);
    }

    // 4. The decision itself.
    const { data: updated, error: uError } = await supabase
      .from("agent_findings")
      .update({ status: "accepted", decided_by: user.id, decided_at: now })
      .eq("id", finding.id)
      .select("*")
      .single();
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ finding: updated, threadId: thread.id });
  } catch (err) {
    return failure(err);
  }
}
