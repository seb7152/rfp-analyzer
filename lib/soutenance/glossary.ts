/**
 * The vocabulary of a consultation: the names a transcription mistakes
 * (suppliers, products, acronyms, the client's sites and tools), dégagés by
 * the organisation's « Vocabulaire » agent from the référentiel and the
 * offers, then kept by hand. Injected in the prompts of the séance's
 * documents and of the transcriptions; drives the transcript's corrections.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ContentPart } from "@/lib/agents/openrouter";
import { isAnthropicModel } from "@/lib/agents/prompt";
import { renderTranscript, type TranscriptSegment, type VoiceNames } from "@/lib/connectors/granola";
import type { Db } from "@/lib/agents/context";
import { loadAiSettings, vocabularyLine } from "@/lib/ai/settings";

export { vocabularyLine };
import { excerpt, type RfpEvalContext } from "./context";
import { fold } from "./transcript";
import type { GlossaryTerm, RfpGlossaryRow } from "./types";

export const MAX_TERMS = 120;
export const MAX_ALIASES = 8;

export async function loadGlossary(db: Db | SupabaseClient, rfpId: string): Promise<RfpGlossaryRow | null> {
  const { data, error } = await db.from("rfp_glossaries").select("*").eq("rfp_id", rfpId).maybeSingle();
  if (error) throw new Error(`Vocabulaire illisible : ${error.message}`);
  const row = data as RfpGlossaryRow | null;
  if (!row) return null;
  return { ...row, terms: cleanTerms(Array.isArray(row.terms) ? row.terms : []), cost: Number(row.cost ?? 0) };
}

export async function loadGlossaryTerms(db: Db | SupabaseClient, rfpId: string): Promise<GlossaryTerm[]> {
  return (await loadGlossary(db, rfpId))?.terms ?? [];
}

/** Trims, drops empties and duplicates (same folded term), caps the lists. */
export function cleanTerms(terms: GlossaryTerm[]): GlossaryTerm[] {
  const seen = new Set<string>();
  const out: GlossaryTerm[] = [];
  for (const t of terms) {
    const term = (t.term ?? "").trim().slice(0, 80);
    if (!term) continue;
    const key = fold(term);
    if (seen.has(key)) continue;
    seen.add(key);
    const aliases: string[] = [];
    const aseen = new Set<string>([key]);
    for (const a of Array.isArray(t.aliases) ? t.aliases : []) {
      const alias = String(a ?? "").trim().slice(0, 80);
      const k = fold(alias);
      if (!alias || aseen.has(k)) continue;
      aseen.add(k);
      aliases.push(alias);
      if (aliases.length >= MAX_ALIASES) break;
    }
    out.push({ term, aliases, note: (t.note ?? "").trim().slice(0, 120), source: t.source === "manual" ? "manual" : "agent" });
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

/**
 * The block the séance's agents receive: the terms with their mistaken
 * forms, and the organisation's own vocabulary. Empty when there is nothing.
 */
export function vocabularyBlock(terms: GlossaryTerm[], orgVocabulary: string): string {
  const lines: string[] = [];
  if (terms.length > 0) {
    lines.push("## Vocabulaire de la consultation");
    lines.push("");
    lines.push("Le transcript est une transcription automatique : ces noms y sont souvent déformés (formes entendues indiquées). Reconnais-les au contexte et écris-les avec leur graphie exacte, sans jamais modifier un extrait cité mot pour mot.");
    lines.push("");
    for (const t of terms) {
      const note = t.note ? ` (${t.note})` : "";
      const aliases = t.aliases.length > 0 ? ` — entendu : ${t.aliases.join(", ")}` : "";
      lines.push(`- ${t.term}${note}${aliases}`);
    }
  }
  if (orgVocabulary.trim()) {
    if (lines.length > 0) lines.push("");
    lines.push(`Vocabulaire de l'organisation à respecter : ${orgVocabulary.trim()}`);
  }
  return lines.join("\n");
}

/** The block for a consultation: its glossary and the organisation's own terms. */
export async function vocabularyFor(db: Db | SupabaseClient, rfpId: string, organizationId: string): Promise<string> {
  const [terms, settings] = await Promise.all([loadGlossaryTerms(db, rfpId), loadAiSettings(db as SupabaseClient, organizationId)]);
  return vocabularyBlock(terms, settings.vocabulary);
}

function cached(modelId: string): { cache_control: { type: "ephemeral" } } | Record<string, never> {
  return isAnthropicModel(modelId) ? { cache_control: { type: "ephemeral" } } : {};
}

function consignes(systemPrompt: string): string {
  return `## Consignes de l'organisation\n\n${systemPrompt.trim()}`;
}

// ---------------------------------------------------------------------------
// Extraction du vocabulaire
// ---------------------------------------------------------------------------

export const GLOSSARY_PREAMBLE = `Tu dégages le vocabulaire propre à une consultation : les noms et termes qu'une transcription automatique de réunion risque de déformer, et que les documents produits doivent écrire exactement. Tu reçois la consultation (titre, description), son référentiel d'exigences par domaine, les fournisseurs en lice et des extraits de leurs réponses.

Tu retiens : les noms des fournisseurs et de leurs produits, modules ou offres ; les sigles et acronymes propres au projet ou au métier ; les noms du client, de ses entités, sites, outils et systèmes existants ; les termes techniques rares. Tu ne retiens pas les mots courants, même métier (ticket, incident, documentation, transition, gouvernance, réversibilité…), les codes d'exigences, ni les termes que toute transcription écrit correctement.

Pour chaque terme : term, sa graphie exacte ; aliases, les formes sous lesquelles une transcription automatique en français pourrait l'entendre, c'est-à-dire des graphies fautives ou des approximations phonétiques que l'on remplacerait par le terme sans hésiter (« Bildi » pour Beeldi, « Service Now » pour ServiceNow, « Capgemini » pour Cap Gémini) ; jamais un synonyme, une traduction, un mot courant, un sigle développé ni une partie du terme (« Mauritius » n'est pas une forme entendue de « Mauritius Delivery Center », « France » n'en est pas une de « Onshore ») : chaque forme entendue sera remplacée d'office dans les transcripts, elle doit donc être sans ambiguïté ; une liste vide vaut mieux qu'une forme douteuse ; note, ce que c'est en deux ou trois mots (fournisseur, produit de X, sigle : développé, site du client…). Soixante termes au plus, les plus utiles d'abord : fournisseurs et produits, puis sigles, puis le reste.

Format de sortie : un objet JSON {"terms": [{"term": "…", "aliases": ["…"], "note": "…"}]}. Aucun texte hors de cet objet.`;

export const GLOSSARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["terms"],
  properties: {
    terms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "aliases", "note"],
        properties: {
          term: { type: "string" },
          aliases: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

const RESPONSES_PER_SUPPLIER = 25;
const RESPONSE_EXCERPT = 320;

export function buildGlossaryMessages(input: { systemPrompt: string; modelId: string; ctx: RfpEvalContext; description: string | null; existing: GlossaryTerm[] }): ChatMessage[] {
  const { ctx } = input;
  const lines: string[] = [];
  lines.push(`Consultation : ${ctx.rfp.title}`);
  if (input.description?.trim()) lines.push(`Description : ${excerpt(input.description, 2000)}`);
  lines.push(`Fournisseurs : ${ctx.suppliers.map((s) => s.name).join(", ") || "aucun"}`);
  lines.push("");
  lines.push("## Référentiel");
  const seen = new Set<string | null>();
  for (const r of ctx.requirements) {
    if (!seen.has(r.domain_id)) {
      seen.add(r.domain_id);
      lines.push("");
      lines.push(`### ${r.domain_code} — ${r.domain_title}`);
    }
    const desc = r.description?.trim() ? ` : ${excerpt(r.description, 300)}` : "";
    lines.push(`- ${r.code} — ${r.title}${desc}`);
  }
  for (const s of ctx.suppliers) {
    const responses = ctx.responses
      .filter((r) => r.supplier_id === s.id && r.response_text?.trim())
      .sort((a, b) => (b.response_text?.length ?? 0) - (a.response_text?.length ?? 0))
      .slice(0, RESPONSES_PER_SUPPLIER);
    if (responses.length === 0) continue;
    lines.push("");
    lines.push(`## Extraits des réponses de ${s.name}`);
    for (const r of responses) lines.push(`- ${excerpt(r.response_text, RESPONSE_EXCERPT)}`);
  }
  if (input.existing.length > 0) {
    lines.push("");
    lines.push("## Termes déjà retenus à la main (à conserver tels quels, tu peux compléter leurs formes entendues)");
    for (const t of input.existing) lines.push(`- ${t.term}${t.note ? ` (${t.note})` : ""}${t.aliases.length ? ` — entendu : ${t.aliases.join(", ")}` : ""}`);
  }
  const system: ContentPart[] = [{ type: "text", text: `${GLOSSARY_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [{ type: "text", text: lines.join("\n"), ...cached(input.modelId) }, { type: "text", text: "Dégage le vocabulaire de cette consultation." }];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ---------------------------------------------------------------------------
// Passe ciblée sur un transcript
// ---------------------------------------------------------------------------

export const TRANSCRIPT_FIX_PREAMBLE = `Tu corriges les mots mal entendus d'une transcription automatique de réunion, à l'aide du vocabulaire de la consultation. Tu reçois le vocabulaire (graphie exacte, formes entendues), puis les prises de parole numérotées.

Tu ne renvoies que des remplacements ciblés : pour chaque mot ou groupe de mots déformé, le numéro de la prise de parole (i), le texte exact à remplacer tel qu'il figure dans la prise de parole (from, copié à l'identique, le plus court possible : le mot ou le groupe de mots déformé seulement), et le texte corrigé (to). Tu corriges : les noms du vocabulaire mal entendus ; les sigles épelés ou déformés ; les noms propres évidents au contexte (une personne nommée ailleurs correctement, un lieu). Tu ne corriges pas : la grammaire, le style oral, les hésitations, la ponctuation, un mot courant même maladroit. Dans le doute, tu ne touches à rien. Si un même texte figure plusieurs fois dans une prise de parole, n indique laquelle (0 pour la première).

Format de sortie : un objet JSON {"replacements": [{"i": 0, "from": "…", "to": "…", "n": 0}]}. Une liste vide si rien n'est à corriger. Aucun texte hors de cet objet.`;

export const TRANSCRIPT_FIX_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["replacements"],
  properties: {
    replacements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["i", "from", "to", "n"],
        properties: { i: { type: "integer" }, from: { type: "string" }, to: { type: "string" }, n: { type: "integer" } },
      },
    },
  },
} as const;

/** Segments per call: a séance of an hour holds a few hundred turns; long ones go in pieces. */
export const FIX_CHUNK_CHARS = 60_000;

export function chunkSegments(segments: TranscriptSegment[]): Array<{ offset: number; segments: TranscriptSegment[] }> {
  const out: Array<{ offset: number; segments: TranscriptSegment[] }> = [];
  let current: TranscriptSegment[] = [];
  let chars = 0;
  let offset = 0;
  segments.forEach((s, i) => {
    if (chars + s.text.length > FIX_CHUNK_CHARS && current.length > 0) {
      out.push({ offset, segments: current });
      current = [];
      chars = 0;
      offset = i;
    }
    current.push(s);
    chars += s.text.length;
  });
  if (current.length > 0) out.push({ offset, segments: current });
  return out;
}

export function buildTranscriptFixMessages(input: {
  systemPrompt: string;
  modelId: string;
  terms: GlossaryTerm[];
  orgVocabulary: string;
  supplierName: string;
  consultationTitle: string;
  segments: TranscriptSegment[];
  offset: number;
  voiceNames: VoiceNames;
}): ChatMessage[] {
  const vocab = vocabularyBlock(input.terms, input.orgVocabulary) || "## Vocabulaire de la consultation\n\n(aucun terme retenu : corrige seulement les noms propres et sigles évidents au contexte)";
  const head = [`Consultation : ${input.consultationTitle}`, `Fournisseur reçu : ${input.supplierName}`, "", vocab].join("\n");
  const body = renderNumbered(input.segments, input.offset, input.voiceNames);
  const system: ContentPart[] = [{ type: "text", text: `${TRANSCRIPT_FIX_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [
    { type: "text", text: head },
    { type: "text", text: `## Prises de parole\n\n${body}`, ...cached(input.modelId) },
    { type: "text", text: "Renvoie les remplacements à faire dans ces prises de parole." },
  ];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function renderNumbered(segments: TranscriptSegment[], offset: number, names: VoiceNames): string {
  // The turn's number is its index in the whole transcript, so replacements come back addressed.
  return segments.map((s, k) => `[${offset + k}] ${renderTranscript([s], names, false)}`).join("\n");
}
