/**
 * The `calculer` tool: one expression at a time, evaluated by mathjs with
 * units and percentages, without any way to run code, read files or alter
 * the parser. Server only (mathjs is heavy).
 */

import { create, all, type MathJsInstance } from "mathjs";

interface SafeMath {
  parse: MathJsInstance["parse"];
  format: MathJsInstance["format"];
}

let mathInstance: SafeMath | null = null;

/**
 * A mathjs instance where everything that could read files, run code or
 * alter the parser is removed from what an expression can call. Our own
 * parse and format are kept from before the removal.
 */
function math(): SafeMath {
  if (mathInstance) return mathInstance;
  const m = create(all);
  const parse = m.parse.bind(m);
  const format = m.format.bind(m);
  const blocked = ["import", "createUnit", "evaluate", "parse", "compile", "simplify", "derivative", "rationalize", "resolve", "help", "chain"];
  const overrides: Record<string, () => never> = {};
  for (const name of blocked) {
    overrides[name] = () => {
      throw new Error(`La fonction ${name} n'est pas disponible.`);
    };
  }
  m.import(overrides, { override: true });
  mathInstance = { parse, format };
  return mathInstance;
}

export const MAX_EXPRESSION_LENGTH = 400;

export interface CalculationResult {
  expression: string;
  result: string;
}

/**
 * Evaluates one expression without side effects. Throws on anything the
 * parser refuses; the message goes back to the model as the tool result.
 */
export function calculate(expressionRaw: string): CalculationResult {
  const expression = expressionRaw.trim();
  if (!expression) throw new Error("Expression vide.");
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new Error(`Expression trop longue (${MAX_EXPRESSION_LENGTH} caractères au plus).`);
  if (/[;\n]/.test(expression)) throw new Error("Une seule expression à la fois.");
  const m = math();
  const node = m.parse(expression);
  // No assignments, no function definitions, no property access chains.
  node.traverse((n) => {
    const type = n.type;
    if (type === "AssignmentNode" || type === "FunctionAssignmentNode" || type === "AccessorNode" || type === "BlockNode") {
      throw new Error("Affectations et accès aux propriétés ne sont pas permis.");
    }
  });
  const value = node.compile().evaluate({});
  const result = m.format(value, { precision: 10 });
  if (result.length > 200) throw new Error("Résultat trop long.");
  return { expression, result };
}

/** Re-evaluates a calculation the model reports, to mark it verified or not. */
export function verifyCalculation(expression: string, reported: string): boolean {
  try {
    const { result } = calculate(expression);
    if (result === reported.trim()) return true;
    const a = parseFloat(result.replace(",", "."));
    const b = parseFloat(reported.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) <= Math.max(1e-6, Math.abs(a) * 1e-3);
    return false;
  } catch {
    return false;
  }
}

/** Runs a client tool call; the string goes back to the model as the tool message. */
export function runClientTool(name: string, argsJson: string): { ok: boolean; output: string; input: unknown } {
  let args: unknown = null;
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { ok: false, output: "Arguments illisibles (JSON attendu).", input: argsJson };
  }
  if (name === "calculer") {
    const expression = typeof (args as { expression?: unknown })?.expression === "string" ? (args as { expression: string }).expression : "";
    try {
      const { result } = calculate(expression);
      return { ok: true, output: JSON.stringify({ expression: expression.trim(), result }), input: args };
    } catch (err) {
      return { ok: false, output: `Erreur de calcul : ${(err as Error).message}`, input: args };
    }
  }
  return { ok: false, output: `Outil inconnu : ${name}.`, input: args };
}
