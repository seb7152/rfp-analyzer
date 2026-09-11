/**
 * What the model receives, in this order: the fixed preamble, the
 * organisation's system prompt, the requirements of the domain, then the
 * supplier's answers, then the batch instruction. Only the answers change
 * from one analysis to the next for a given agent, and only the batch
 * instruction changes between two batches of the same analysis, so the
 * stable head of the context can be served from the provider's prompt cache.
 */

import type { ChatMessage, ContentPart } from "./openrouter";
import type { ReasoningEffort } from "./types";

export interface DomainLeaf {
  id: string;
  code: string;
  title: string;
  description: string | null;
  context: string | null;
  is_mandatory: boolean;
  /** Codes of the categories from the assigned domain down to the leaf's category. */
  path: string[];
}

export interface DomainDescription {
  code: string;
  title: string;
  /** Sub-domains in display order, with their level relative to the assigned domain. */
  categories: Array<{ id: string; code: string; title: string; depth: number }>;
  leaves: DomainLeaf[];
}

export const PREAMBLE = `Tu relis les réponses d'un fournisseur à une consultation (appel d'offres), sur un domaine du référentiel d'exigences. Tu reçois toutes les exigences du domaine et toutes les réponses du fournisseur à ces exigences ; tu produis une proposition d'évaluation pour chaque exigence demandée, et seulement celles-là.

Échelle de notation, de 0 à 5 par pas de 0,5 : 5 = l'exigence est pleinement couverte, avec des engagements précis et vérifiables ; 4 = couverte avec une réserve mineure ; 3 = couverte en partie, des éléments importants manquent ou restent vagues ; 2 = réponse générale ou promesse sans engagement ; 1 = réponse très insuffisante ou hors sujet pour l'essentiel ; 0 = aucune réponse ou refus.

Verdicts : conforme, partiel, non_conforme, non_repondu (la réponse est vide ou ne traite pas l'exigence), hors_sujet.

Contraintes : chaque justification s'appuie sur un ou plusieurs extraits copiés mot pour mot de la réponse du fournisseur, sans reformulation, sans points de suspension ajoutés ; une exigence sans réponse reçoit le verdict non_repondu, la note 0 et aucun extrait ; tu n'inventes rien qui ne soit dans la réponse ; les renvois du fournisseur à d'autres exigences et ses contradictions internes comptent dans l'évaluation. La justification tient en quelques phrases. Les questions au fournisseur et les risques sont des listes courtes, vides quand il n'y a rien à dire. Tout est rédigé en français.

Format de sortie : un objet JSON {"findings": [...]} où chaque élément porte requirement_id_external (le code de l'exigence, tel quel), verdict, proposed_score, justification, quotes (liste d'extraits verbatim), questions (liste), risks (liste). Aucun texte hors de cet objet.`;

function block(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

export function requirementsBlock(domain: DomainDescription): string {
  const lines: string[] = [];
  lines.push(`Domaine ${domain.code} — ${domain.title}`);
  if (domain.categories.length > 0) {
    lines.push("");
    lines.push("Sous-domaines :");
    for (const c of domain.categories) {
      lines.push(`${"  ".repeat(c.depth)}- ${c.code} — ${c.title}`);
    }
  }
  lines.push("");
  lines.push("Exigences :");
  for (const leaf of domain.leaves) {
    lines.push("");
    lines.push(`### ${leaf.code} — ${leaf.title}${leaf.is_mandatory ? " (obligatoire)" : ""}`);
    if (leaf.path.length > 0) lines.push(`Sous-domaine : ${leaf.path.join(" › ")}`);
    if (leaf.description?.trim()) lines.push(leaf.description.trim());
    if (leaf.context?.trim()) lines.push(`Contexte : ${leaf.context.trim()}`);
  }
  return block("Exigences du domaine", lines.join("\n"));
}

export function responsesBlock(
  supplierName: string,
  leaves: DomainLeaf[],
  responseText: (requirementId: string) => string | null
): string {
  const lines: string[] = [`Fournisseur : ${supplierName}`];
  for (const leaf of leaves) {
    const text = responseText(leaf.id);
    lines.push("");
    lines.push(`### Réponse à ${leaf.code}`);
    lines.push(text && text.trim() ? text.trim() : "(aucune réponse)");
  }
  return block("Réponses du fournisseur", lines.join("\n"));
}

export function batchInstruction(codes: string[]): string {
  return block(
    "Exigences à évaluer dans cette réponse",
    `Produis une proposition pour chacune des exigences suivantes, et uniquement pour celles-ci : ${codes.join(", ")}.`
  );
}

export interface BuildMessagesInput {
  systemPrompt: string;
  modelId: string;
  domain: DomainDescription;
  supplierName: string;
  responseText: (requirementId: string) => string | null;
  targetCodes: string[];
}

/** Whether the served model is Anthropic's: only then is cache_control sent. */
export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith("anthropic/");
}

export function buildMessages(input: BuildMessagesInput): ChatMessage[] {
  const anthropic = isAnthropicModel(input.modelId);
  const cache = anthropic ? ({ type: "ephemeral" } as const) : undefined;
  const system: ContentPart[] = [
    { type: "text", text: `${PREAMBLE}\n\n## Consignes de l'organisation\n\n${input.systemPrompt.trim()}` },
  ];
  const user: ContentPart[] = [
    { type: "text", text: requirementsBlock(input.domain), ...(cache ? { cache_control: cache } : {}) },
    {
      type: "text",
      text: responsesBlock(input.supplierName, input.domain.leaves, input.responseText),
      ...(cache ? { cache_control: cache } : {}),
    },
    { type: "text", text: batchInstruction(input.targetCodes) },
  ];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Characters of the stable context for one analysis (used by the estimate). */
export function contextLength(input: Omit<BuildMessagesInput, "targetCodes" | "modelId">): number {
  return (
    PREAMBLE.length +
    input.systemPrompt.length +
    requirementsBlock(input.domain).length +
    responsesBlock(input.supplierName, input.domain.leaves, input.responseText).length
  );
}

/** Rough token count for French prose: about one token per four characters. */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export const DEFAULT_REASONING: ReasoningEffort = "high";
