/**
 * A first draft of an agent's system prompt, written by a model from the
 * agent's name and short description. The draft covers only what the fixed
 * preamble leaves to the organisation: the reviewer's role, what to look at
 * in that domain, how to weigh it. It never restates the scale, the output
 * format or the verbatim-quote rule, which the preamble already imposes.
 * Written by the organisation-wide default model (OPENROUTER_DEFAULT_MODEL).
 */

import { DEFAULT_MODEL_ID, streamChatCompletion } from "./openrouter";
import { PREAMBLE } from "./prompt";

const DRAFT_SYSTEM = `Tu aides une organisation à configurer un agent relecteur d'appels d'offres. Chaque agent a un prompt système propre à sa spécialité, placé après un préambule fixe que tu ne dois ni répéter ni contredire. Le préambule est le suivant :

<preambule>
${PREAMBLE}
</preambule>

Tu rédiges uniquement les « consignes de l'organisation » de l'agent : ce que le préambule laisse à sa spécialité. Le texte, en français, tutoie l'agent et comprend, en paragraphes courts ou listes sobres :
- son rôle et son expertise ;
- ce qu'il examine en priorité dans les réponses de ce domaine (engagements attendus, preuves à chercher, points de vigilance) ;
- ce qui distingue une réponse solide d'une réponse vague dans ce domaine, pour orienter la note ;
- les signaux d'alerte et les questions à poser au fournisseur quand ils apparaissent.

Il ne reprend ni l'échelle de notation, ni les verdicts, ni le format JSON, ni la règle des extraits verbatim. Il n'invente pas de contexte sur l'organisation. Entre 150 et 400 mots, en texte brut : pas de Markdown, pas de gras, pas de titres ; les listes commencent par un tiret. Tu réponds avec ce texte seul, sans introduction ni balises de code.`;

export interface DraftInput {
  name: string;
  description: string;
  /** The prompt already in the form, to draw on when the user asks for a rewrite. */
  currentPrompt?: string;
}

export interface DraftResult {
  prompt: string;
  model: string | null;
  cost: number;
}

export async function draftSystemPrompt(input: DraftInput): Promise<DraftResult> {
  const lines = [`Nom de l'agent : ${input.name.trim() || "(sans nom)"}`, `Description courte : ${input.description.trim()}`];
  if (input.currentPrompt?.trim()) {
    lines.push("", "Prompt actuel, à améliorer sans perdre ce qui y est précis :", input.currentPrompt.trim());
  }
  const result = await streamChatCompletion({
    model: DEFAULT_MODEL_ID,
    messages: [
      { role: "system", content: DRAFT_SYSTEM },
      { role: "user", content: lines.join("\n") },
    ],
    reasoning: "none",
    jsonSchema: null,
    maxTokens: 2_000,
    timeoutMs: 90_000,
  });
  const prompt = result.content
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/, "")
    .trim();
  if (!prompt) throw new Error("Le modèle n'a rien proposé.");
  return { prompt, model: result.model, cost: result.usage.cost };
}
