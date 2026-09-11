import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { runWorkerRound, triggerWorker } from "@/lib/agents/worker";

// The batches run in parallel with a 240 s timeout each: this route needs the
// full 300 s that Fluid compute allows (vercel.json caps the other API routes
// at 30 s; this export wins for this file).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/agents/worker — protected by a header secret. Answers 202 at
 * once and works in the background: requeues lost batches, claims a few
 * pending ones, runs them, then re-triggers itself while work remains.
 * Also called every minute by pg_cron (supabase/sql/agent_worker_cron.sql).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.AGENT_WORKER_SECRET;
  if (!secret || request.headers.get("x-agent-worker-secret") !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const origin = request.nextUrl.origin;
  waitUntil(
    runWorkerRound()
      .then((report) => {
        console.log("[agents] worker round:", JSON.stringify(report));
        if (report.remaining && report.claimed > 0) return triggerWorker(origin);
      })
      .catch((err) => console.error("[agents] worker round failed:", err))
  );
  return NextResponse.json({ accepted: true }, { status: 202 });
}
