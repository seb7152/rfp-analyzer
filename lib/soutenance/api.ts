/**
 * Shared server pieces of the chapter's routes: the overview a page needs,
 * the access rule of the Granola connector, the agents' worker trigger.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { RfpAccess } from "@/lib/agents/auth";
import { loadGranolaSettings, type GranolaSettings } from "@/lib/connectors/granola-settings";
import { hasEnvFallback, loadKeyRow, resolveKey } from "@/lib/connectors/keys";
import { loadSystemAgent } from "./agents";
import { loadRfpEvalContext, type RfpEvalContext } from "./context";
import { computeDomainScores, loadCategoryWeights, type DomainScores } from "./scores";
import { loadSessionSummaries, resolveTargetVersion, type SessionSummary } from "./sessions";
import type { SoutenanceSyntheseRow } from "./types";

export interface Overview {
  access: RfpAccess;
  rfp: { id: string; title: string; organization_id: string };
  version: RfpEvalContext["version"];
  targetVersion: Awaited<ReturnType<typeof resolveTargetVersion>>;
  versions: Array<{ id: string; version_number: number; version_name: string; is_active: boolean }>;
  suppliers: RfpEvalContext["suppliers"];
  domains: Array<{ id: string; code: string; title: string }>;
  scores: DomainScores;
  sessions: SessionSummary[];
  synthese: SoutenanceSyntheseRow | null;
  agents: { soutenance: { name: string; model_id: string } | null; synthese: { name: string; model_id: string } | null };
  granola: { available: boolean; scope: "user" | "organization" | "env" | null; settings: GranolaSettings; canFetch: boolean };
}

export async function loadOverview(db: SupabaseClient, rfpId: string, userId: string, access: RfpAccess): Promise<Overview | NextResponse> {
  const { data: versions, error: vError } = await db
    .from("evaluation_versions")
    .select("id, version_number, version_name, is_active")
    .eq("rfp_id", rfpId)
    .order("version_number", { ascending: false });
  if (vError) throw new Error(`Versions illisibles : ${vError.message}`);
  const list = (versions ?? []) as Overview["versions"];
  const active = list.find((v) => v.is_active) ?? null;
  if (!active) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });

  const ctx = await loadRfpEvalContext(db, rfpId, active.id);
  const [weights, sessions, targetVersion, { data: synth }, soutenanceAgent, syntheseAgent, granolaSettings] = await Promise.all([
    loadCategoryWeights(db, rfpId),
    loadSessionSummaries(db, rfpId, ctx.suppliers),
    resolveTargetVersion(db, rfpId),
    db.from("soutenance_syntheses").select("*").eq("rfp_id", rfpId).eq("version_id", active.id).maybeSingle(),
    loadSystemAgent(db, ctx.rfp.organization_id, "soutenance"),
    loadSystemAgent(db, ctx.rfp.organization_id, "synthese"),
    loadGranolaSettings(db, ctx.rfp.organization_id),
  ]);
  const key = await resolveKey("granola", ctx.rfp.organization_id, userId, granolaSettings.personal_keys);
  const canFetch = access === "owner" || access === "admin" || (granolaSettings.fetch_by === "evaluators" && access === "evaluator");
  return {
    access,
    rfp: ctx.rfp,
    version: ctx.version,
    targetVersion,
    versions: list,
    suppliers: ctx.suppliers,
    domains: ctx.domains.map((d) => ({ id: d.id, code: d.code, title: d.title })),
    scores: computeDomainScores(ctx, weights),
    sessions,
    synthese: (synth as SoutenanceSyntheseRow | null) ?? null,
    agents: {
      soutenance: soutenanceAgent ? { name: soutenanceAgent.name, model_id: soutenanceAgent.model_id } : null,
      synthese: syntheseAgent ? { name: syntheseAgent.name, model_id: syntheseAgent.model_id } : null,
    },
    granola: { available: !!key, scope: key?.scope ?? null, settings: granolaSettings, canFetch: canFetch && !!key },
  };
}

/** Whether this member may list Granola meetings and fetch a transcript on this consultation, and with which key. */
export async function granolaAccess(db: SupabaseClient, organizationId: string, userId: string, access: RfpAccess) {
  const settings = await loadGranolaSettings(db, organizationId);
  const allowed = access === "owner" || access === "admin" || (settings.fetch_by === "evaluators" && access === "evaluator");
  if (!allowed) return { error: NextResponse.json({ error: "La récupération des transcripts est réservée aux pilotes de la consultation." }, { status: 403 }), key: null };
  const key = await resolveKey("granola", organizationId, userId, settings.personal_keys);
  if (!key) {
    return { error: NextResponse.json({ error: "Aucune clé Granola : ajoutez-en une dans Agents & IA › Connecteurs." }, { status: 409 }), key: null };
  }
  return { error: null, key };
}

/** What the connectors page shows: the organisation's key and the member's own, never their values. */
export async function granolaStatus(db: SupabaseClient, organizationId: string, userId: string) {
  const [org, own, settings] = await Promise.all([loadKeyRow("granola", organizationId, null), loadKeyRow("granola", organizationId, userId), loadGranolaSettings(db, organizationId)]);
  return {
    organization: org ? { last4: org.last4, verified_at: org.verified_at, verified_meta: org.verified_meta, updated_at: org.updated_at } : null,
    personal: own ? { last4: own.last4, verified_at: own.verified_at, verified_meta: own.verified_meta, updated_at: own.updated_at } : null,
    env_fallback: hasEnvFallback("granola"),
    settings,
  };
}
