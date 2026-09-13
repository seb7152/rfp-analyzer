/**
 * What the models receive for the Soutenances chapter: the brief of a
 * séance, the point de synthèse of a supplier, the compte rendu of a
 * transcript, and the proposals on requirements after the séance. Fixed
 * preambles carry the method; the organisation's system agent carries the
 * tone and the house rules.
 */

import type { ChatMessage, ContentPart } from "@/lib/agents/openrouter";
import { isAnthropicModel } from "@/lib/agents/prompt";
import { renderTranscript, type TranscriptSegment, type VoiceNames } from "@/lib/connectors/granola";
import { STATUS_LABEL, excerpt, finalScoreOf, fmtScore, normaliseCode, othersMean, responseOf, type EvalRequirement, type EvalResponse, type RfpEvalContext } from "./context";
import type { BriefStatus, SyntheseData } from "./types";

function consignes(systemPrompt: string): string {
  return `## Consignes de l'organisation\n\n${systemPrompt.trim()}`;
}

function cached(modelId: string): { cache_control: { type: "ephemeral" } } | Record<string, never> {
  return isAnthropicModel(modelId) ? { cache_control: { type: "ephemeral" } } : {};
}

function byWeightThenOrder(a: EvalRequirement, b: EvalRequirement): number {
  if (b.weight !== a.weight) return b.weight - a.weight;
  return a.display_order - b.display_order;
}

function domainsInOrder(ctx: RfpEvalContext): Array<{ id: string | null; code: string; title: string }> {
  const seen = new Map<string | null, { id: string | null; code: string; title: string }>();
  for (const r of ctx.requirements) {
    if (!seen.has(r.domain_id)) seen.set(r.domain_id, { id: r.domain_id, code: r.domain_code, title: r.domain_title });
  }
  return Array.from(seen.values());
}

function evaluationLines(ctx: RfpEvalContext, r: EvalRequirement, resp: EvalResponse | undefined, supplierId: string): string[] {
  const lines: string[] = [];
  const score = finalScoreOf(resp);
  const others = othersMean(ctx, r.id, supplierId);
  lines.push(
    `Poids : ${r.weight}${r.is_mandatory ? " · obligatoire" : ""} · Statut : ${resp ? STATUS_LABEL[resp.status] : "à évaluer"} · Note : ${fmtScore(score)}/5 · Moyenne des autres fournisseurs : ${fmtScore(others)}/5`
  );
  if (resp?.manual_comment?.trim()) lines.push(`Commentaire de l'évaluateur : ${excerpt(resp.manual_comment, 800)}`);
  if (resp?.question?.trim()) lines.push(`Question de l'évaluateur : « ${excerpt(resp.question, 400)} »`);
  if (resp?.ai_comment?.trim()) lines.push(`Analyse IA (extrait) : ${excerpt(resp.ai_comment, 400)}`);
  if (resp?.ai_question?.trim()) lines.push(`Question IA : ${excerpt(resp.ai_question, 300)}`);
  return lines;
}

// ---------------------------------------------------------------------------
// Brief de séance
// ---------------------------------------------------------------------------

export const BRIEF_PREAMBLE = `Tu prépares le brief d'une soutenance : la séance où l'équipe d'évaluation reçoit un fournisseur pour clarifier son offre. Tu reçois les exigences retenues pour ce brief (celles dont l'évaluation appelle une clarification), l'état de leur évaluation, la réponse écrite du fournisseur, les commentaires et questions des évaluateurs, la note moyenne des autres fournisseurs, et le cas échéant les questions déjà retenues au point de synthèse avec le client.

Tu rédiges un document en Markdown, en français, prêt à être remis aux membres de l'équipe qui tiendront la séance, avec exactement ces sections dans cet ordre :

## En deux mots
Trois à cinq phrases : où en est ce fournisseur, ce que la séance doit lever.

## Points à clarifier en séance
Une liste numérotée, du plus important au moins important (poids de l'exigence, écart avec les autres fournisseurs, risque pour le projet). Vingt points au plus. Chaque point : **CODE — Titre de l'exigence** (poids, statut, note du fournisseur et moyenne des autres), puis une phrase de constat fondée sur la réponse écrite et le commentaire de l'évaluateur, puis « Question à poser : » suivie d'une question précise, fermée quand c'est possible, qui appelle un engagement.

## Questions ouvertes des évaluateurs
Les questions écrites par les évaluateurs, reprises telles quelles entre guillemets, chacune précédée du code de l'exigence ; « Aucune » s'il n'y en a pas.

## Engagements à obtenir
Ce qu'il faut faire confirmer par écrit à l'issue de la séance : une liste courte.

## Déroulé proposé
L'ordre de passage des points en trois ou quatre temps, avec une durée indicative, pour une séance d'une heure trente.

Règles : tu ne cites que ce qui figure dans les données ; tu n'inventes ni chiffre, ni engagement, ni titre d'exigence ; tu ne reformules pas les questions des évaluateurs ; tu cites toujours le code de l'exigence avec son titre exact. Une question retenue au point de synthèse porte sur une exigence dont le titre t'est donné : reprends-le tel quel. Tu écris en français, quelle que soit la langue des réponses et des commentaires. Aucun texte hors du document, pas de préambule.`;

export function briefRequirements(ctx: RfpEvalContext, supplierId: string, statuses: BriefStatus[]): Array<{ req: EvalRequirement; resp: EvalResponse | undefined }> {
  const real = new Set<string>(statuses.filter((s) => s !== "pass_with_question"));
  const withQuestion = statuses.includes("pass_with_question");
  const out: Array<{ req: EvalRequirement; resp: EvalResponse | undefined }> = [];
  for (const req of ctx.requirements) {
    const resp = responseOf(ctx, req.id, supplierId);
    const status = resp?.status ?? "pending";
    const keep = real.has(status) || (withQuestion && status === "pass" && !!resp?.question?.trim());
    if (keep) out.push({ req, resp });
  }
  return out.sort((a, b) => byWeightThenOrder(a.req, b.req));
}

export function buildBriefMessages(input: {
  systemPrompt: string;
  modelId: string;
  ctx: RfpEvalContext;
  supplierId: string;
  statuses: BriefStatus[];
  synthese: SyntheseData | null;
  /** The consultation's vocabulary block, empty when there is none. */
  vocabulary?: string;
}): { messages: ChatMessage[]; count: number } {
  const supplier = input.ctx.suppliers.find((s) => s.id === input.supplierId);
  const items = briefRequirements(input.ctx, input.supplierId, input.statuses);
  const lines: string[] = [];
  lines.push(`Consultation : ${input.ctx.rfp.title}`);
  lines.push(`Fournisseur : ${supplier?.name ?? "Fournisseur"}`);
  lines.push(`Version d'évaluation : ${input.ctx.version?.version_name ?? "—"}`);
  lines.push(`Exigences retenues pour le brief : ${items.length}, par ordre de poids décroissant.`);
  for (const d of domainsInOrder(input.ctx)) {
    const inDomain = items.filter((i) => i.req.domain_id === d.id);
    if (inDomain.length === 0) continue;
    lines.push("");
    lines.push(`## Domaine ${d.code} — ${d.title}`);
    for (const { req, resp } of inDomain) {
      lines.push("");
      lines.push(`### ${req.code} — ${req.title}`);
      if (req.path.length > 1) lines.push(`Sous-domaine : ${req.path.slice(1).join(" › ")}`);
      if (req.description?.trim()) lines.push(`Exigence : ${excerpt(req.description, 500)}`);
      lines.push(...evaluationLines(input.ctx, req, resp, input.supplierId));
      lines.push(`Réponse écrite (extrait) : ${excerpt(resp?.response_text, 1000) || "(aucune réponse)"}`);
    }
  }
  const synth = input.synthese?.suppliers?.[input.supplierId];
  if (synth) {
    const qs = Object.entries(synth.domains).flatMap(([, d]) => d.questions);
    if (qs.length > 0) {
      lines.push("");
      lines.push("## Questions retenues au point de synthèse avec le client");
      for (const q of qs) {
        const req = input.ctx.requirements.find((r) => normaliseCode(r.code) === normaliseCode(q.code));
        lines.push(`- ${q.code}${req ? ` — ${req.title}` : ""} : ${q.text}`);
      }
    }
  }
  if (input.vocabulary?.trim()) {
    lines.push("");
    lines.push(input.vocabulary.trim());
  }
  const system: ContentPart[] = [{ type: "text", text: `${BRIEF_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [{ type: "text", text: lines.join("\n"), ...cached(input.modelId) }, { type: "text", text: "Rédige le brief de cette séance." }];
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    count: items.length,
  };
}

// ---------------------------------------------------------------------------
// Point de synthèse (par fournisseur)
// ---------------------------------------------------------------------------

export const SYNTHESE_PREAMBLE = `Tu prépares le point de synthèse : la réunion où l'équipe d'évaluation présente à son client l'état de l'analyse des offres, domaine par domaine, avant de choisir les fournisseurs reçus en soutenance. Tu reçois, pour un fournisseur, toutes les exigences du référentiel groupées par domaine, avec pour chacune son poids, le statut et la note retenus, le commentaire de l'évaluateur, sa question éventuelle, et la note moyenne des autres fournisseurs.

Pour chaque domaine, tu dégages :
- forces : cinq au plus, ce qui distingue favorablement ce fournisseur (note élevée et bien justifiée, écart favorable avec les autres, exigence de poids élevé) ;
- faiblesses : cinq au plus, ce qui pèse contre lui (note faible, statut partiel, non conforme ou roadmap, écart défavorable, question restée sans réponse) ;
- questions : trois au plus, à lui poser en soutenance pour lever une faiblesse ou confirmer une force incertaine, précises et actionnables.

Chaque point est une phrase de vingt-cinq mots au plus, fondée sur le commentaire de l'évaluateur et l'évaluation, qui cite un fait (chiffre, engagement, absence) et se lit à voix haute devant le client. Le champ code est le code exact de l'exigence concernée. Un domaine sans exigence notée reçoit des listes vides. Priorise par poids décroissant puis par écart avec les autres fournisseurs. Tu écris en français, quelle que soit la langue des commentaires et des réponses.

Format de sortie : un objet JSON {"domains": [{"code": "…", "forces": [{"code": "…", "text": "…"}], "faiblesses": [...], "questions": [...]}]} avec un élément par domaine reçu, dans l'ordre reçu. Aucun texte hors de cet objet.`;

export const SYNTHESE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["domains"],
  properties: {
    domains: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "forces", "faiblesses", "questions"],
        properties: {
          code: { type: "string", description: "Code du domaine, repris tel quel." },
          forces: { type: "array", items: { type: "object", additionalProperties: false, required: ["code", "text"], properties: { code: { type: "string" }, text: { type: "string" } } } },
          faiblesses: { type: "array", items: { type: "object", additionalProperties: false, required: ["code", "text"], properties: { code: { type: "string" }, text: { type: "string" } } } },
          questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["code", "text"], properties: { code: { type: "string" }, text: { type: "string" } } } },
        },
      },
    },
  },
} as const;

export function buildSyntheseMessages(input: { systemPrompt: string; modelId: string; ctx: RfpEvalContext; supplierId: string }): ChatMessage[] {
  const supplier = input.ctx.suppliers.find((s) => s.id === input.supplierId);
  const lines: string[] = [];
  lines.push(`Consultation : ${input.ctx.rfp.title}`);
  lines.push(`Fournisseur : ${supplier?.name ?? "Fournisseur"}`);
  lines.push(`Version d'évaluation : ${input.ctx.version?.version_name ?? "—"}`);
  for (const d of domainsInOrder(input.ctx)) {
    const reqs = input.ctx.requirements.filter((r) => r.domain_id === d.id).sort(byWeightThenOrder);
    lines.push("");
    lines.push(`## Domaine ${d.code} — ${d.title} (${reqs.length} exigences)`);
    for (const req of reqs) {
      const resp = responseOf(input.ctx, req.id, input.supplierId);
      const score = finalScoreOf(resp);
      const others = othersMean(input.ctx, req.id, input.supplierId);
      const parts = [
        `- ${req.code} — ${req.title} (poids ${req.weight}${req.is_mandatory ? ", obligatoire" : ""}) : ${resp ? STATUS_LABEL[resp.status] : "à évaluer"}, note ${fmtScore(score)}, autres ${fmtScore(others)}`,
      ];
      if (resp?.manual_comment?.trim()) parts.push(`Commentaire : ${excerpt(resp.manual_comment, 400)}`);
      if (resp?.question?.trim()) parts.push(`Question : « ${excerpt(resp.question, 200)} »`);
      if (!resp?.manual_comment?.trim() && resp?.ai_comment?.trim()) parts.push(`Analyse IA : ${excerpt(resp.ai_comment, 300)}`);
      lines.push(parts.join(". "));
    }
  }
  const system: ContentPart[] = [{ type: "text", text: `${SYNTHESE_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [{ type: "text", text: lines.join("\n"), ...cached(input.modelId) }, { type: "text", text: "Produis la synthèse de ce fournisseur, domaine par domaine." }];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ---------------------------------------------------------------------------
// Compte rendu de séance (et exigences concernées)
// ---------------------------------------------------------------------------

export const REPORT_PREAMBLE = `Tu rédiges le compte rendu d'une soutenance : la séance où l'équipe d'évaluation a reçu un fournisseur pour clarifier son offre. Tu reçois le brief préparé avant la séance s'il existe, l'index des exigences du référentiel avec l'état de leur évaluation, et le transcript de la séance, horodaté, dont les voix sont distinguées mais pas toujours nommées : tu déduis du contexte qui parle pour le fournisseur et qui parle pour l'équipe d'évaluation, sans jamais attribuer un propos à une personne nommée que le transcript ne nomme pas.

Tu produis deux choses.

1. report_markdown : le compte rendu, en français, en Markdown, avec exactement ces sections dans cet ordre :
## En deux mots
Trois à cinq phrases sur ce que la séance a apporté.
## Ce qui a été dit, par domaine
Une sous-section « ### CODE — Titre du domaine » par domaine abordé, dans l'ordre du référentiel ; sous chacune, une liste de points ; chaque point commence par le code de l'exigence en gras (**L2.3**), rapporte ce que le fournisseur a dit, et se termine par l'horodatage du passage entre crochets, par exemple [00:41:12].
## Écarts entre l'écrit et l'oral
Les points où ce qui a été dit complète, nuance ou contredit la réponse écrite, avec le code de l'exigence ; « Aucun écart relevé. » sinon.
## Engagements pris en séance
Chaque engagement avec le code de l'exigence, ce qui est promis, par qui (la voix, ou le nom s'il a été donné), et l'échéance si elle a été dite ; « Aucun. » sinon.
## Questions restées sans réponse
Les questions du brief ou de l'équipe qui n'ont pas reçu de réponse claire, avec le code ; « Aucune. » sinon.
## À confirmer par écrit
Ce qu'il faut demander au fournisseur de confirmer après la séance.

2. addressed : la liste des exigences dont l'évaluation pourrait changer à la suite de la séance (réponse apportée à une question, engagement pris, nuance ou contradiction, information nouvelle), chacune avec son code exact tel qu'il figure dans l'index, l'horodatage du passage principal, et une phrase disant pourquoi. Quarante au plus, les plus importantes d'abord. N'inclus pas une exigence seulement mentionnée en passant.

Règles : tu ne rapportes que ce que le transcript contient ; les horodatages sont ceux du transcript ; tu ne juges pas la qualité de l'offre ; un propos oral reste un propos oral tant qu'il n'est pas confirmé par écrit ; tu écris en français, quelle que soit la langue du transcript.

Format de sortie : un objet JSON {"report_markdown": "…", "addressed": [{"code": "…", "at": "hh:mm:ss", "why": "…"}]}. Aucun texte hors de cet objet.`;

export const REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["report_markdown", "addressed"],
  properties: {
    report_markdown: { type: "string" },
    addressed: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "at", "why"],
        properties: { code: { type: "string" }, at: { type: "string" }, why: { type: "string" } },
      },
    },
  },
} as const;

export function requirementIndex(ctx: RfpEvalContext, supplierId: string): string {
  const lines: string[] = [];
  for (const d of domainsInOrder(ctx)) {
    const reqs = ctx.requirements.filter((r) => r.domain_id === d.id);
    lines.push(`## ${d.code} — ${d.title}`);
    for (const req of reqs) {
      const resp = responseOf(ctx, req.id, supplierId);
      const q = resp?.question?.trim() ? ` · question de l'évaluateur : « ${excerpt(resp.question, 160)} »` : "";
      lines.push(`- ${req.code} — ${req.title} (poids ${req.weight}) : ${resp ? STATUS_LABEL[resp.status] : "à évaluer"}, note ${fmtScore(finalScoreOf(resp))}${q}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function buildReportMessages(input: {
  systemPrompt: string;
  modelId: string;
  ctx: RfpEvalContext;
  supplierId: string;
  brief: string | null;
  segments: TranscriptSegment[];
  voiceNames: VoiceNames;
  vocabulary?: string;
}): ChatMessage[] {
  const supplier = input.ctx.suppliers.find((s) => s.id === input.supplierId);
  const head = [
    `Consultation : ${input.ctx.rfp.title}`,
    `Fournisseur reçu : ${supplier?.name ?? "Fournisseur"}`,
    `Version d'évaluation : ${input.ctx.version?.version_name ?? "—"}`,
    "",
    "## Index des exigences et état de l'évaluation avant la séance",
    "",
    requirementIndex(input.ctx, input.supplierId),
    ...(input.vocabulary?.trim() ? ["", input.vocabulary.trim()] : []),
  ].join("\n");
  const brief = input.brief?.trim() ? `## Brief préparé avant la séance\n\n${input.brief.trim()}` : "## Brief préparé avant la séance\n\n(aucun brief)";
  const transcript = `## Transcript de la séance\n\n${renderTranscript(input.segments, input.voiceNames, true)}`;
  const system: ContentPart[] = [{ type: "text", text: `${REPORT_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [
    { type: "text", text: head },
    { type: "text", text: brief },
    { type: "text", text: transcript, ...cached(input.modelId) },
    { type: "text", text: "Rédige le compte rendu et la liste des exigences concernées." },
  ];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ---------------------------------------------------------------------------
// Propositions après la séance (lots d'exigences)
// ---------------------------------------------------------------------------

export const SOUTENANCE_BATCH_PREAMBLE = `Tu relis l'évaluation d'un fournisseur à la lumière de sa soutenance. Tu reçois le transcript de la séance, horodaté, puis, pour chaque exigence à traiter, la réponse écrite du fournisseur et l'évaluation actuelle (statut, note, commentaire et question de l'évaluateur, analyse IA). Tu proposes ce que la séance change.

Pour chaque exigence demandée, tu produis une proposition : verdict (conforme, partiel, non_conforme, non_repondu, hors_sujet) et proposed_score (0 à 5 par pas de 0,5) tels que tu les vois après la séance, en tenant compte de l'écrit et de l'oral ; justification : ce qui a été dit, ce que cela change par rapport à l'écrit, et ce qui reste à confirmer, en quelques phrases ; quotes : un ou plusieurs extraits copiés mot pour mot du transcript (le texte d'une prise de parole, sans l'horodatage ni le nom de la voix, sans reformulation ni points de suspension ajoutés) ; questions : ce qu'il reste à demander au fournisseur, par écrit ; risks : ce qui fragilise l'engagement oral.

Échelle : 5 = exigence pleinement couverte, avec des engagements précis et vérifiables ; 4 = couverte avec une réserve mineure ; 3 = couverte en partie ; 2 = réponse générale ou promesse sans engagement ; 1 = très insuffisante ; 0 = aucune réponse. Une promesse orale sans échéance ni écrit ne vaut pas un engagement : elle n'élève pas la note au-delà de 3, sauf si l'écrit couvrait déjà l'essentiel. Si la séance n'apporte rien sur une exigence demandée, tu reprends l'évaluation actuelle, tu le dis dans la justification et tu ne cites aucun extrait.

Contraintes : chaque extrait existe mot pour mot dans le transcript ; tu n'inventes rien ; tout est en français.

Format de sortie : un objet JSON {"findings": [...]} où chaque élément porte requirement_id_external (le code de l'exigence, tel quel), verdict, proposed_score, justification, quotes (liste d'extraits verbatim du transcript), questions (liste), risks (liste). Aucun texte hors de cet objet.`;

export interface SoutenanceBatchItem {
  req: EvalRequirement;
  resp: EvalResponse | undefined;
  /** What the compte rendu said about this requirement, when it did. */
  why: string | null;
  at: string | null;
}

export function buildSoutenanceBatchMessages(input: {
  systemPrompt: string;
  modelId: string;
  supplierName: string;
  segments: TranscriptSegment[];
  voiceNames: VoiceNames;
  items: SoutenanceBatchItem[];
  ctx: RfpEvalContext;
  supplierId: string;
  vocabulary?: string;
}): ChatMessage[] {
  const vocabulary = input.vocabulary?.trim() ? `${input.vocabulary.trim()}\n\n` : "";
  const transcript = `${vocabulary}## Transcript de la séance\n\nFournisseur reçu : ${input.supplierName}\n\n${renderTranscript(input.segments, input.voiceNames, true)}`;
  const lines: string[] = ["## Exigences à traiter"];
  for (const { req, resp, why, at } of input.items) {
    lines.push("");
    lines.push(`### ${req.code} — ${req.title}`);
    lines.push(`Domaine : ${req.domain_code} — ${req.domain_title}${req.path.length > 1 ? ` › ${req.path.slice(1).join(" › ")}` : ""}`);
    if (req.description?.trim()) lines.push(`Exigence : ${excerpt(req.description, 600)}`);
    lines.push(...evaluationLines(input.ctx, req, resp, input.supplierId));
    lines.push(`Réponse écrite : ${excerpt(resp?.response_text, 1500) || "(aucune réponse écrite)"}`);
    if (why) lines.push(`Relevé du compte rendu${at ? ` [${at}]` : ""} : ${why}`);
  }
  const instruction = `## Exigences à évaluer dans cette réponse\n\nProduis une proposition pour chacune des exigences suivantes, et uniquement pour celles-ci : ${input.items.map((i) => i.req.code).join(", ")}.`;
  const system: ContentPart[] = [{ type: "text", text: `${SOUTENANCE_BATCH_PREAMBLE}\n\n${consignes(input.systemPrompt)}` }];
  const user: ContentPart[] = [
    { type: "text", text: transcript, ...cached(input.modelId) },
    { type: "text", text: lines.join("\n") },
    { type: "text", text: instruction },
  ];
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Markdown returned in a code fence, or with a preamble: keep the document. */
export function cleanMarkdown(text: string): string {
  const t = text.trim();
  const fence = t.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return (fence ? fence[1] : t).trim();
}
