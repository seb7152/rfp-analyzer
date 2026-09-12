import { z } from "zod";
import { VERDICTS } from "./types";

/**
 * The model's output for one batch: a list of proposals indexed by the
 * requirement's external code. Validated in code before any proposal is
 * written, whatever the model or the provider promised.
 */

export const findingOutputSchema = z.object({
  requirement_id_external: z.string().min(1),
  verdict: z.enum(VERDICTS as [string, ...string[]]),
  proposed_score: z.number().min(0).max(5),
  justification: z.string(),
  quotes: z.array(z.string()),
  questions: z.array(z.string()),
  risks: z.array(z.string()),
  /** Calculations the model made with the tool and wants to cite (re-evaluated here). */
  calculations: z.array(z.object({ expression: z.string(), result: z.string() })).default([]),
  /** Web pages the model relied on (checked against the pages the server tools actually returned). */
  sources: z.array(z.object({ url: z.string(), title: z.string().nullable().default(null) })).default([]),
});

export const batchOutputSchema = z.object({
  findings: z.array(findingOutputSchema),
});

export type FindingOutput = z.infer<typeof findingOutputSchema>;
export type BatchOutput = z.infer<typeof batchOutputSchema>;

/** JSON Schema sent as `response_format` (strict) to models that support it. */
export const BATCH_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "requirement_id_external",
          "verdict",
          "proposed_score",
          "justification",
          "quotes",
          "questions",
          "risks",
        ],
        properties: {
          requirement_id_external: {
            type: "string",
            description: "Code de l'exigence, repris tel quel.",
          },
          verdict: { type: "string", enum: VERDICTS },
          proposed_score: {
            type: "number",
            description: "Note de 0 à 5 par pas de 0,5.",
          },
          justification: {
            type: "string",
            description: "Quelques phrases au plus.",
          },
          quotes: {
            type: "array",
            items: { type: "string" },
            description: "Extraits copiés mot pour mot de la réponse.",
          },
          questions: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

/** The same schema with evidence fields, sent when the agent has tools. */
export const BATCH_JSON_SCHEMA_WITH_TOOLS = {
  ...BATCH_JSON_SCHEMA,
  properties: {
    findings: {
      ...BATCH_JSON_SCHEMA.properties.findings,
      items: {
        ...BATCH_JSON_SCHEMA.properties.findings.items,
        required: [...BATCH_JSON_SCHEMA.properties.findings.items.required, "calculations", "sources"],
        properties: {
          ...BATCH_JSON_SCHEMA.properties.findings.items.properties,
          calculations: {
            type: "array",
            description: "Calculs faits avec l'outil calculer et cités dans la justification : expression et résultat tels que rendus par l'outil. Vide sinon.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["expression", "result"],
              properties: { expression: { type: "string" }, result: { type: "string" } },
            },
          },
          sources: {
            type: "array",
            description: "Pages web consultées par les outils et utilisées pour cette exigence : adresse exacte et titre. Vide sinon.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["url", "title"],
              properties: { url: { type: "string" }, title: { type: ["string", "null"] } },
            },
          },
        },
      },
    },
  },
} as const;

/** Rounds to the product's scale: 0–5 by steps of 0.5. */
export function toHalfStep(score: number): number {
  const clamped = Math.max(0, Math.min(5, score));
  return Math.round(clamped * 2) / 2;
}

/**
 * Extracts a JSON object from free text (models without structured outputs
 * may wrap it in a code fence or prose).
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }
  throw new Error("Aucun objet JSON trouvé dans la sortie du modèle.");
}
