/**
 * Utility functions for financial calculations
 * US-1-009: Calculate subtotals and totals for financial templates
 */

export interface FinancialTemplateLine {
  id: string;
  template_id: string;
  parent_id: string | null;
  line_code: string;
  name: string;
  line_type: "setup" | "recurrent";
  recurrence_type: "monthly" | "yearly" | null;
  custom_formula: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface FinancialOfferValue {
  id: string;
  version_id: string;
  template_line_id: string;
  setup_cost: number | null;
  recurrent_cost: number | null;
  quantity: number;
}

export interface LineWithValues extends FinancialTemplateLine {
  setup_cost?: number;
  recurrent_cost?: number;
  quantity?: number;
  children?: LineWithValues[];
  subtotal_setup?: number;
  subtotal_recurrent?: number;
}

/**
 * Build a hierarchical tree structure from flat line data
 */
export function buildLineTree(
  lines: FinancialTemplateLine[],
  values?: FinancialOfferValue[]
): LineWithValues[] {
  // Create a map for quick lookup
  const lineMap = new Map<string, LineWithValues>();

  // Initialize all lines
  lines.forEach((line) => {
    const lineWithValues: LineWithValues = {
      ...line,
      children: [],
    };

    // Add values if provided
    if (values) {
      const value = values.find((v) => v.template_line_id === line.id);
      if (value) {
        lineWithValues.setup_cost = value.setup_cost || 0;
        lineWithValues.recurrent_cost = value.recurrent_cost || 0;
        lineWithValues.quantity = value.quantity || 1;
      }
    }

    lineMap.set(line.id, lineWithValues);
  });

  // Build tree structure
  const rootLines: LineWithValues[] = [];

  lineMap.forEach((line) => {
    if (line.parent_id) {
      const parent = lineMap.get(line.parent_id);
      if (parent) {
        parent.children!.push(line);
      }
    } else {
      rootLines.push(line);
    }
  });

  return rootLines;
}

/**
 * Calculate subtotals recursively for a line and its children
 */
export function calculateSubtotals(line: LineWithValues): {
  subtotal_setup: number;
  subtotal_recurrent: number;
} {
  let subtotalSetup = 0;
  let subtotalRecurrent = 0;

  // Calculate direct costs for this line
  if (line.setup_cost !== undefined && line.quantity !== undefined) {
    subtotalSetup = (line.setup_cost || 0) * line.quantity;
  }

  if (line.recurrent_cost !== undefined && line.quantity !== undefined) {
    let recurrentCost = (line.recurrent_cost || 0) * line.quantity;

    // Convert monthly to yearly if needed
    if (line.recurrence_type === "monthly") {
      recurrentCost = recurrentCost * 12;
    }

    subtotalRecurrent = recurrentCost;
  }

  // Recursively calculate subtotals for children
  if (line.children && line.children.length > 0) {
    line.children.forEach((child) => {
      const childSubtotals = calculateSubtotals(child);
      subtotalSetup += childSubtotals.subtotal_setup;
      subtotalRecurrent += childSubtotals.subtotal_recurrent;
    });
  }

  // Store calculated subtotals
  line.subtotal_setup = subtotalSetup;
  line.subtotal_recurrent = subtotalRecurrent;

  return {
    subtotal_setup: subtotalSetup,
    subtotal_recurrent: subtotalRecurrent,
  };
}

/**
 * Calculate all subtotals for a tree of lines
 */
export function calculateAllSubtotals(
  lines: LineWithValues[]
): LineWithValues[] {
  lines.forEach((line) => {
    calculateSubtotals(line);
  });
  return lines;
}

/**
 * Calculate total setup, recurrent, and TCO for a template
 */
export function calculateTotals(
  lines: LineWithValues[],
  periodYears: number = 3
): {
  total_setup: number;
  total_recurrent_annual: number;
  tco: number;
} {
  let totalSetup = 0;
  let totalRecurrentAnnual = 0;

  lines.forEach((line) => {
    totalSetup += line.subtotal_setup || 0;
    totalRecurrentAnnual += line.subtotal_recurrent || 0;
  });

  const tco = totalSetup + totalRecurrentAnnual * periodYears;

  return {
    total_setup: totalSetup,
    total_recurrent_annual: totalRecurrentAnnual,
    tco,
  };
}

/**
 * Flatten a hierarchical tree structure to a flat array
 * Useful for displaying in tables with indentation
 */
export function flattenLineTree(
  lines: LineWithValues[],
  level: number = 0
): Array<LineWithValues & { level: number }> {
  const result: Array<LineWithValues & { level: number }> = [];

  lines.forEach((line) => {
    result.push({ ...line, level });

    if (line.children && line.children.length > 0) {
      result.push(...flattenLineTree(line.children, level + 1));
    }
  });

  return result;
}

/**
 * Evaluate a custom formula
 * Supported variables: {setup_cost}, {recurrent_cost}, {quantity}, {total_period_years}
 */
export function evaluateCustomFormula(
  formula: string,
  variables: {
    setup_cost?: number;
    recurrent_cost?: number;
    quantity?: number;
    total_period_years?: number;
  }
): number {
  try {
    let evaluatedFormula = formula;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      evaluatedFormula = evaluatedFormula.replace(regex, String(value || 0));
    });

    // Evaluate the formula (basic arithmetic only)
    // eslint-disable-next-line no-eval
    const result = eval(evaluatedFormula);

    return typeof result === "number" && !isNaN(result) ? result : 0;
  } catch (error) {
    console.error("Error evaluating custom formula:", error);
    return 0;
  }
}

/**
 * Format a monetary value for display
 */
export function formatCurrency(
  value: number,
  locale: string = "fr-FR",
  currency: string = "EUR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a recurrent cost with frequency
 */
export function formatRecurrentCost(
  cost: number,
  recurrenceType: "monthly" | "yearly",
  locale: string = "fr-FR",
  currency: string = "EUR"
): string {
  const formattedCost = formatCurrency(cost, locale, currency);
  const suffix = recurrenceType === "monthly" ? "/mois" : "/an";
  return `${formattedCost}${suffix}`;
}
