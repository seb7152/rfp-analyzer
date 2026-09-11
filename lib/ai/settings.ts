/**
 * Organisation settings for the small AI helpers of the evaluation workspace:
 * dictation of a comment or question (audio → text, lightly cleaned up) and
 * rewriting of a text already typed. Both run on OpenRouter with models and
 * prompts the organisation can change; a null column means the default here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AssistField = "comment" | "question";

export const FIELD_LABEL: Record<AssistField, string> = {
  comment: "commentaire d'évaluation",
  question: "question au fournisseur",
};

/** Cheap models by default: a minute of dictation costs well under a cent. */
export const DEFAULT_TRANSCRIPTION_MODEL_ID = process.env.OPENROUTER_TRANSCRIPTION_MODEL || "google/gemini-3.5-flash-lite";
export const DEFAULT_REWRITE_MODEL_ID = process.env.OPENROUTER_REWRITE_MODEL || "google/gemini-3.5-flash-lite";

/**
 * Placeholders replaced at run time: {{champ}} (commentaire d'évaluation /
 * question au fournisseur), {{consultation}} (its title), {{fournisseurs}}
 * (names of the suppliers of the consultation, the current one first),
 * {{vocabulaire}} (the organisation's own terms).
 */
export const DEFAULT_TRANSCRIPTION_PROMPT = `Tu transcris la dictée d'un évaluateur d'appel d'offres. Il dicte un {{champ}} sur la consultation « {{consultation}} ».

Tu rends ce qu'il dit, fidèlement et en français : tu ponctues, tu retires les hésitations, les répétitions et les faux départs, tu coupes en paragraphes quand il change de sujet. Tu ne résumes pas, tu ne complètes pas, tu n'ajoutes aucune formule. Si une phrase est inaudible, tu la remplaces par [inaudible].

Noms à orthographier exactement : {{fournisseurs}}.
{{vocabulaire}}

Réponds avec le texte transcrit seul, sans introduction ni guillemets.`;

export const DEFAULT_REWRITE_PROMPT = `Tu remets en forme un {{champ}} rédigé par un évaluateur d'appel d'offres, sur la consultation « {{consultation}} ».

Tu corriges l'orthographe, la grammaire et la ponctuation, tu clarifies les phrases lourdes et tu structures en paragraphes courts si le texte est long. Tu gardes le sens, le ton, le vocabulaire métier et la longueur : tu n'ajoutes aucune information, aucune formule de politesse, aucun jugement qui n'est pas dans le texte. Une question reste une question, adressée au fournisseur.

Noms à orthographier exactement : {{fournisseurs}}.
{{vocabulaire}}

Réponds avec le texte remis en forme seul, sans introduction ni guillemets.`;

export interface AiSettings {
  transcription_model_id: string;
  transcription_prompt: string;
  rewrite_model_id: string;
  rewrite_prompt: string;
  vocabulary: string;
  updated_at: string | null;
}

export interface AiSettingsRow {
  organization_id: string;
  transcription_model_id: string | null;
  transcription_prompt: string | null;
  rewrite_model_id: string | null;
  rewrite_prompt: string | null;
  vocabulary: string;
  updated_at: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  transcription_model_id: DEFAULT_TRANSCRIPTION_MODEL_ID,
  transcription_prompt: DEFAULT_TRANSCRIPTION_PROMPT,
  rewrite_model_id: DEFAULT_REWRITE_MODEL_ID,
  rewrite_prompt: DEFAULT_REWRITE_PROMPT,
  vocabulary: "",
  updated_at: null,
};

/** The organisation's settings with defaults filled in; defaults alone when no row exists. */
export async function loadAiSettings(db: SupabaseClient, organizationId: string): Promise<AiSettings> {
  const { data, error } = await db.from("organization_ai_settings").select("*").eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(`Réglages IA illisibles : ${error.message}`);
  const row = data as AiSettingsRow | null;
  if (!row) return DEFAULT_AI_SETTINGS;
  return {
    transcription_model_id: row.transcription_model_id?.trim() || DEFAULT_TRANSCRIPTION_MODEL_ID,
    transcription_prompt: row.transcription_prompt?.trim() || DEFAULT_TRANSCRIPTION_PROMPT,
    rewrite_model_id: row.rewrite_model_id?.trim() || DEFAULT_REWRITE_MODEL_ID,
    rewrite_prompt: row.rewrite_prompt?.trim() || DEFAULT_REWRITE_PROMPT,
    vocabulary: row.vocabulary ?? "",
    updated_at: row.updated_at,
  };
}

export interface PromptContext {
  field: AssistField;
  consultationTitle: string;
  /** The supplier the text is about first, then the others. */
  supplierNames: string[];
  vocabulary: string;
}

export function renderPrompt(template: string, ctx: PromptContext): string {
  const vocabulary = ctx.vocabulary.trim() ? `Vocabulaire de l'organisation à respecter : ${ctx.vocabulary.trim()}` : "";
  return template
    .replace(/\{\{champ\}\}/g, FIELD_LABEL[ctx.field])
    .replace(/\{\{consultation\}\}/g, ctx.consultationTitle || "sans titre")
    .replace(/\{\{fournisseurs\}\}/g, ctx.supplierNames.length > 0 ? ctx.supplierNames.join(", ") : "aucun")
    .replace(/\{\{vocabulaire\}\}/g, vocabulary)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
