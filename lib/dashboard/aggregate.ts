/**
 * Pure aggregation for GET /api/rfps/[rfpId]/dashboard.
 *
 * The previous inline implementation re-scanned `allResponses` inside nested
 * loops over suppliers, categories and requirements, giving roughly
 * O(suppliers x categories x responses x requirements) work — several hundred
 * thousand comparisons for a mid-sized RFP. Everything here is index-first:
 * responses are bucketed once by supplier and by requirement, requirements once
 * by category, and every figure is then read off those maps.
 *
 * Kept as a standalone pure module so it can be benchmarked and diffed against
 * the previous implementation (see scripts/perf/).
 */

export type ResponseStatus =
  | "pending"
  | "pass"
  | "partial"
  | "fail"
  | "roadmap";

export interface AggregateResponse {
  requirement_id: string;
  supplier_id: string;
  version_id?: string | null;
  status: ResponseStatus | string;
  is_checked: boolean;
  manual_score: number | null;
  ai_score: number | null;
  supplier?: { name?: string | null } | null;
}

export interface AggregateRequirement {
  id: string;
  title: string;
  level?: number | null;
  parent_id?: string | null;
  category_id?: string | null;
  weight?: number | null;
}

export interface AggregateCategory {
  id: string;
  title: string;
  weight?: number | null;
}

export interface AggregateInput {
  requirements: AggregateRequirement[];
  categories: AggregateCategory[];
  responses: AggregateResponse[];
  /**
   * When set, supplier analysis is restricted to these suppliers (version
   * shortlist). When undefined, suppliers are derived from the responses.
   */
  activeSupplierIds?: Set<string>;
  /**
   * Version whose responses count towards the completion percentage, and the
   * suppliers active in it. Mirrors the previous `getRFPCompletionPercentage`.
   */
  completion?: {
    versionId: string | null;
    activeSupplierIds: Set<string> | null;
  };
}

/** `manual_score || ai_score || 0` — preserved verbatim, zeros fall through. */
function scoreOf(response: AggregateResponse): number {
  return response.manual_score || response.ai_score || 0;
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
}

/**
 * Share of leaf-requirement responses that have been checked, over the
 * completion version and its active suppliers.
 */
export function computeCompletionPercentage(
  requirements: AggregateRequirement[],
  responses: AggregateResponse[],
  completion?: AggregateInput["completion"]
): number {
  const parentIds = new Set<string>();
  for (const requirement of requirements) {
    if (requirement.parent_id) {
      parentIds.add(requirement.parent_id);
    }
  }

  const leafRequirementIds = new Set<string>();
  for (const requirement of requirements) {
    if (!parentIds.has(requirement.id)) {
      leafRequirementIds.add(requirement.id);
    }
  }

  const versionId = completion?.versionId ?? null;
  const activeSupplierIds = completion?.activeSupplierIds ?? null;

  let total = 0;
  let checked = 0;

  for (const response of responses) {
    if (versionId && response.version_id !== versionId) continue;
    if (activeSupplierIds && !activeSupplierIds.has(response.supplier_id))
      continue;
    if (!leafRequirementIds.has(response.requirement_id)) continue;

    total++;
    if (response.is_checked) checked++;
  }

  if (total === 0) return 0;
  return Math.round((checked / total) * 100);
}

export function aggregateDashboard(input: AggregateInput) {
  const { requirements, categories, responses } = input;

  // ---- Single indexing pass over responses -------------------------------
  const responsesBySupplier = new Map<string, AggregateResponse[]>();
  const responsesByRequirement = new Map<string, AggregateResponse[]>();
  const supplierNameById = new Map<string, string>();

  const statusDistribution = {
    pass: 0,
    partial: 0,
    fail: 0,
    pending: 0,
    roadmap: 0,
  };
  const scoreSumBySupplier = new Map<string, number>();
  const responseCountBySupplier = new Map<string, number>();

  for (const response of responses) {
    pushTo(responsesBySupplier, response.supplier_id, response);
    pushTo(responsesByRequirement, response.requirement_id, response);

    if (response.status in statusDistribution) {
      statusDistribution[response.status as keyof typeof statusDistribution]++;
    }

    scoreSumBySupplier.set(
      response.supplier_id,
      (scoreSumBySupplier.get(response.supplier_id) || 0) + scoreOf(response)
    );
    responseCountBySupplier.set(
      response.supplier_id,
      (responseCountBySupplier.get(response.supplier_id) || 0) + 1
    );

    if (!supplierNameById.has(response.supplier_id)) {
      supplierNameById.set(
        response.supplier_id,
        response.supplier?.name || `Fournisseur ${response.supplier_id}`
      );
    }
  }

  const averageScores: Record<string, number> = {};
  for (const [supplierId, sum] of scoreSumBySupplier) {
    averageScores[supplierId] =
      sum / (responseCountBySupplier.get(supplierId) || 1);
  }

  // ---- Requirements indexed by category ----------------------------------
  const requirementsByCategoryId = new Map<string, AggregateRequirement[]>();
  const categoryIdByRequirementId = new Map<string, string>();
  let totalRequirements = 0;

  for (const requirement of requirements) {
    if (requirement.level === 4) totalRequirements++;
    if (requirement.category_id) {
      pushTo(requirementsByCategoryId, requirement.category_id, requirement);
      categoryIdByRequirementId.set(requirement.id, requirement.category_id);
    }
  }

  // ---- Supplier x category scores ----------------------------------------
  const suppliers = input.activeSupplierIds
    ? Array.from(input.activeSupplierIds)
    : Array.from(new Set(responses.map((response) => response.supplier_id)));

  const suppliersData = suppliers.map((supplierId) => {
    const supplierResponses = responsesBySupplier.get(supplierId) || [];

    // One pass over this supplier's responses, bucketed by category.
    const sumByCategory = new Map<string, number>();
    const countByCategory = new Map<string, number>();

    for (const response of supplierResponses) {
      const categoryId = categoryIdByRequirementId.get(response.requirement_id);
      if (!categoryId) continue;
      sumByCategory.set(
        categoryId,
        (sumByCategory.get(categoryId) || 0) + scoreOf(response)
      );
      countByCategory.set(
        categoryId,
        (countByCategory.get(categoryId) || 0) + 1
      );
    }

    const categoryScores: Record<string, number> = {};
    let totalScore = 0;
    for (const category of categories) {
      const score =
        (sumByCategory.get(category.id) || 0) /
        Math.max(countByCategory.get(category.id) || 0, 1);
      categoryScores[category.id] = score;
      totalScore += score;
    }

    return {
      supplierId,
      supplierName:
        supplierNameById.get(supplierId) ||
        supplierResponses[0]?.supplier?.name ||
        `Fournisseur ${supplierId}`,
      totalScore,
      categoryScores,
      ranking: 0,
    };
  });

  const rankedSuppliers = [...suppliersData].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  rankedSuppliers.forEach((supplier, index) => {
    supplier.ranking = index + 1;
  });

  const performanceMatrix = {
    suppliers: rankedSuppliers.map((supplier) => supplier.supplierName),
    categories: categories.map((category) => category.title),
    scores: rankedSuppliers.map((supplier) =>
      categories.map((category) => supplier.categoryScores[category.id] || 0)
    ),
  };

  const avgTotalScore =
    rankedSuppliers.reduce((sum, supplier) => sum + supplier.totalScore, 0) /
    rankedSuppliers.length;

  const ranking = rankedSuppliers.map((supplier) => ({
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName,
    finalScore: supplier.totalScore,
    ranking: supplier.ranking,
    variation: ((supplier.totalScore - avgTotalScore) / avgTotalScore) * 100,
  }));

  // ---- Category level analysis -------------------------------------------
  const categoriesAnalysis = categories.map((category) => {
    const categoryRequirements =
      requirementsByCategoryId.get(category.id) || [];

    let sum = 0;
    let count = 0;
    let checked = 0;

    for (const requirement of categoryRequirements) {
      for (const response of responsesByRequirement.get(requirement.id) || []) {
        sum += scoreOf(response);
        count++;
        if (response.is_checked) checked++;
      }
    }

    return {
      id: category.id,
      title: category.title,
      currentWeight: category.weight || 1,
      requirementCount: categoryRequirements.length,
      averageScore: sum / Math.max(count, 1),
      completionRate: (checked / Math.max(count, 1)) * 100,
    };
  });

  const requirementsByCategory: Record<
    string,
    Array<{
      id: string;
      title: string;
      currentWeight: number;
      averageScore: number;
      status: ResponseStatus;
    }>
  > = {};

  for (const category of categories) {
    const categoryRequirements =
      requirementsByCategoryId.get(category.id) || [];

    requirementsByCategory[category.id] = categoryRequirements.map(
      (requirement) => {
        const requirementResponses =
          responsesByRequirement.get(requirement.id) || [];

        let sum = 0;
        let checkedCount = 0;
        for (const response of requirementResponses) {
          sum += scoreOf(response);
          if (response.is_checked) checkedCount++;
        }
        const totalCount = requirementResponses.length;

        let status: ResponseStatus = "pending";
        if (checkedCount === totalCount && totalCount > 0) status = "pass";
        else if (checkedCount > 0 && checkedCount < totalCount)
          status = "partial";
        else if (checkedCount === 0 && totalCount > 0) status = "pending";

        return {
          id: requirement.id,
          title: requirement.title,
          currentWeight: requirement.weight || 1,
          averageScore: sum / Math.max(totalCount, 1),
          status,
        };
      }
    );
  }

  const weightsConfiguration = {
    categories: categories.map((category) => ({
      id: category.id,
      title: category.title,
      currentWeight: category.weight || 1,
      defaultWeight: category.weight || 1,
    })),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      categoryId: requirement.category_id || "",
      currentWeight: requirement.weight || 1,
      defaultWeight: requirement.weight || 1,
    })),
  };

  const completionPercentage = computeCompletionPercentage(
    requirements,
    responses,
    input.completion
  );

  return {
    totalRequirements,
    completionPercentage,
    evaluatedRequirements: Math.round(
      (completionPercentage / 100) * totalRequirements
    ),
    statusDistribution,
    averageScores,
    suppliersAnalysis: {
      comparisonTable: rankedSuppliers,
      performanceMatrix,
      ranking,
    },
    categoriesAnalysis: {
      categories: categoriesAnalysis,
      requirementsByCategory,
    },
    weightsConfiguration,
  };
}
