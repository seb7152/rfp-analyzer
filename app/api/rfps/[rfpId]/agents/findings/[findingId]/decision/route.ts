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

    // One transaction under the caller's RLS: score, comment, thread, peer
    // review, decision (see accept_agent_finding in the migration).
    const { data: threadId, error: acceptError } = await supabase.rpc("accept_agent_finding", {
      p_finding_id: finding.id,
      p_comment: commentContent(finding),
    });
    if (acceptError) {
      const forbidden = /évaluateur ou pilote|Non authentifié/.test(acceptError.message);
      const conflict = /déjà été décidée/.test(acceptError.message);
      return NextResponse.json(
        { error: acceptError.message.replace(/^.*?: /, "") },
        { status: forbidden ? 403 : conflict ? 409 : 500 }
      );
    }
    const { data: updated } = await supabase.from("agent_findings").select("*").eq("id", finding.id).single();
    return NextResponse.json({ finding: updated, threadId });
  } catch (err) {
    return failure(err);
  }
}
