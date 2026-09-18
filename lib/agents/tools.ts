/**
 * The tools an agent may use, chosen per agent and versioned with its
 * prompt. Two kinds: client tools we run here (a calculator with units, no
 * code execution) and OpenRouter server tools run inside the request (web
 * search, web fetch). Each use is journaled, and what the model cites from
 * them becomes evidence on the proposal, verified like a verbatim quote.
 * Kept free of heavy imports: the client reads it too. The calculator lives
 * in calculator.ts.
 */

export const TOOL_IDS = ["calculer", "web_search", "web_fetch"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export interface AgentTools {
  enabled: ToolId[];
  /** Web searches and fetches allowed per batch (each costs a few thousandths of a dollar). */
  web_max_uses: number;
  /** Empty: the whole web. Otherwise only these domains (and their subdomains). */
  web_allowed_domains: string[];
}

export const DEFAULT_TOOLS: AgentTools = { enabled: [], web_max_uses: 5, web_allowed_domains: [] };

export const TOOL_META: Record<ToolId, { label: string; description: string; kind: "client" | "server"; cost: string }> = {
  calculer: {
    label: "Calcul",
    description: "Évalue des expressions avec unités et pourcentages (disponibilité en minutes, pénalités plafonnées, cumuls). L'expression et le résultat sont joints à la proposition.",
    kind: "client",
    cost: "Gratuit",
  },
  web_search: {
    label: "Recherche web",
    description: "Vérifie une référence, une certification, une actualité du fournisseur. Les pages consultées sont citées avec la proposition.",
    kind: "server",
    cost: "≈ 0,007 $ par recherche",
  },
  web_fetch: {
    label: "Lecture de page web",
    description: "Lit une adresse précise (site du fournisseur, registre, documentation). Sans réseau vers l'application.",
    kind: "server",
    cost: "Gratuit jusqu'à 50 pages par lot",
  },
};

/** Reads a stored `tools` column, tolerant of older rows. */
export function parseTools(raw: unknown): AgentTools {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof AgentTools, unknown>>;
  const enabled = Array.isArray(r.enabled) ? (r.enabled.filter((t): t is ToolId => (TOOL_IDS as readonly string[]).includes(String(t))) as ToolId[]) : [];
  const max = typeof r.web_max_uses === "number" && Number.isFinite(r.web_max_uses) ? Math.max(1, Math.min(20, Math.round(r.web_max_uses))) : DEFAULT_TOOLS.web_max_uses;
  const domains = Array.isArray(r.web_allowed_domains)
    ? r.web_allowed_domains.map((d) => String(d).trim().toLowerCase()).filter(Boolean).slice(0, 50)
    : [];
  return { enabled: Array.from(new Set(enabled)), web_max_uses: max, web_allowed_domains: domains };
}

export function toolsEqual(a: AgentTools, b: AgentTools): boolean {
  return JSON.stringify(parseTools(a)) === JSON.stringify(parseTools(b));
}

// ─── Definitions sent to OpenRouter ────────────────────────────────────────

const CALCULER_DEFINITION = {
  type: "function",
  function: {
    name: "calculer",
    description:
      "Évalue une expression mathématique, avec unités et pourcentages si besoin (ex. « (1 - 99.9%) * 30 days in minutes », « min(2% * 10, 10%) * 120000 »). Utilise-la pour tout calcul que tu veux citer : le résultat est vérifié et joint à la proposition.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["expression"],
      properties: {
        expression: { type: "string", description: "L'expression à évaluer, en notation mathématique (syntaxe mathjs)." },
      },
    },
  },
};

/** The `tools` array for a request, from the agent's settings. Empty when no tool is enabled. */
export function toolDefinitions(tools: AgentTools): unknown[] {
  const defs: unknown[] = [];
  if (tools.enabled.includes("calculer")) defs.push(CALCULER_DEFINITION);
  const domains = tools.web_allowed_domains.length > 0 ? { allowed_domains: tools.web_allowed_domains } : {};
  if (tools.enabled.includes("web_search")) {
    defs.push({ type: "openrouter:web_search", parameters: { max_uses: tools.web_max_uses, max_results: 5, search_context_size: "medium", ...domains } });
  }
  if (tools.enabled.includes("web_fetch")) {
    defs.push({ type: "openrouter:web_fetch", parameters: { max_uses: tools.web_max_uses, max_content_tokens: 20_000, ...domains } });
  }
  return defs;
}
