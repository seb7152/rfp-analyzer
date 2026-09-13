/**
 * The organisation's system agents: one for the soutenances (brief, compte
 * rendu, propositions from the transcript), one for the point de synthèse,
 * one for the vocabulary of a consultation and the transcripts' corrections.
 * Created on first use with a default prompt, then edited like any agent in
 * Agents & IA; never assigned to a domain.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_MODEL_ID } from "@/lib/agents/openrouter";
import { DEFAULT_TOOLS } from "@/lib/agents/tools";
import type { Db } from "@/lib/agents/context";

export type SystemAgentKind = "soutenance" | "synthese" | "vocabulaire";

/**
 * Default reasoning: the synthèse and the vocabulary are extractions over
 * explicit data, where reasoning mostly inflates the output; the séance's
 * documents deserve some.
 */
export const SYSTEM_AGENT_REASONING: Record<SystemAgentKind, "none" | "medium" | "high"> = { soutenance: "medium", synthese: "none", vocabulaire: "none" };

export const SYSTEM_AGENT_META: Record<SystemAgentKind, { name: string; description: string; prompt: string }> = {
  soutenance: {
    name: "Soutenances",
    description: "Prépare le brief de chaque séance, rédige le compte rendu et propose les évolutions de l'évaluation à partir du transcript.",
    prompt: `Tu assistes une équipe de consultants qui évalue des offres pour son client. Le ton est celui d'un compte rendu professionnel : factuel, précis, sans complaisance ni jugement de valeur sur les personnes. Tu cites les exigences par leur code. Tu distingues toujours ce qui est écrit dans l'offre, ce qui a été dit en séance et ce qui reste à confirmer par écrit. Une promesse orale n'est pas un engagement contractuel : tu le rappelles quand c'est utile. Tu écris en français, sans anglicismes inutiles.`,
  },
  synthese: {
    name: "Point de synthèse",
    description: "Dégage, par domaine et par fournisseur, les forces, les faiblesses et les questions à poser avant les soutenances.",
    prompt: `Tu assistes une équipe de consultants qui présente à son client l'état de l'évaluation des offres avant les soutenances. Les forces et faiblesses que tu retiens sont celles qui pèsent dans la décision : poids de l'exigence, écart avec les autres fournisseurs, risque pour le projet. Tu t'appuies sur les commentaires des évaluateurs, jamais sur ta propre lecture des offres. Chaque point tient en une phrase, cite le code de l'exigence et se lit à voix haute devant le client. Tu écris en français.`,
  },
  vocabulaire: {
    name: "Vocabulaire et transcripts",
    description: "Dégage le vocabulaire propre à la consultation (fournisseurs, produits, sigles, noms du client) et corrige les transcripts de séance avec.",
    prompt: `Tu assistes une équipe de consultants qui évalue des offres pour son client. Le vocabulaire que tu retiens est celui qu'une transcription automatique déforme : noms de fournisseurs, de produits et de modules, sigles et acronymes du métier, noms du client, de ses sites et de ses outils. Tu écris chaque terme avec sa graphie exacte. Quand tu corriges un transcript, tu ne touches qu'aux mots mal entendus : jamais au sens, à l'ordre des mots ni au style oral. Tu écris en français.`,
  },
};

export interface SystemAgentVersion {
  agent_id: string;
  agent_version_id: string;
  version_number: number;
  name: string;
  system_prompt: string;
  model_id: string;
  reasoning_effort: "none" | "medium" | "high";
}

/**
 * The current version of the organisation's system agent of a kind, created
 * with the service role when missing (any member may trigger the first use).
 */
export async function ensureSystemAgent(organizationId: string, kind: SystemAgentKind, createdBy: string | null): Promise<SystemAgentVersion> {
  const db = createServiceClient();
  const existing = await loadSystemAgent(db, organizationId, kind);
  if (existing) return existing;
  const meta = SYSTEM_AGENT_META[kind];
  const { data: agent, error } = await db
    .from("agents")
    .insert({
      organization_id: organizationId,
      kind,
      name: meta.name,
      description: meta.description,
      system_prompt: meta.prompt,
      model_id: DEFAULT_MODEL_ID,
      reasoning_effort: SYSTEM_AGENT_REASONING[kind],
      tools: DEFAULT_TOOLS,
      current_version: 1,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error || !agent) {
    // Created concurrently by another request: read it.
    const again = await loadSystemAgent(db, organizationId, kind);
    if (again) return again;
    throw new Error(`Agent système non créé : ${error?.message ?? "inconnu"}`);
  }
  const { error: vError } = await db.from("agent_versions").insert({
    agent_id: agent.id,
    version_number: 1,
    system_prompt: meta.prompt,
    model_id: DEFAULT_MODEL_ID,
    reasoning_effort: SYSTEM_AGENT_REASONING[kind],
    tools: DEFAULT_TOOLS,
    created_by: createdBy,
  });
  if (vError) throw new Error(`Version de l'agent système non créée : ${vError.message}`);
  const created = await loadSystemAgent(db, organizationId, kind);
  if (!created) throw new Error("Agent système introuvable après création.");
  return created;
}

export async function loadSystemAgent(db: Db, organizationId: string, kind: SystemAgentKind): Promise<SystemAgentVersion | null> {
  const { data: agent, error } = await db
    .from("agents")
    .select("id, name, current_version, system_prompt, model_id, reasoning_effort")
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Agent système illisible : ${error.message}`);
  if (!agent) return null;
  const { data: version, error: vError } = await db
    .from("agent_versions")
    .select("id, version_number, system_prompt, model_id, reasoning_effort")
    .eq("agent_id", agent.id)
    .eq("version_number", agent.current_version)
    .maybeSingle();
  if (vError) throw new Error(`Version d'agent illisible : ${vError.message}`);
  const v = version as { id: string; version_number: number; system_prompt: string; model_id: string; reasoning_effort: "none" | "medium" | "high" } | null;
  return {
    agent_id: agent.id,
    agent_version_id: v?.id ?? "",
    version_number: v?.version_number ?? agent.current_version,
    name: agent.name,
    system_prompt: v?.system_prompt ?? agent.system_prompt,
    model_id: v?.model_id ?? agent.model_id,
    reasoning_effort: v?.reasoning_effort ?? agent.reasoning_effort,
  };
}
