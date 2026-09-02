/**
 * Equivalence check + benchmark for the RFP dashboard aggregation.
 *
 * `legacyAggregate` below is the aggregation that used to live inline in
 * app/api/rfps/[rfpId]/dashboard/route.ts, copied verbatim. The script feeds
 * both it and the current `aggregateDashboard` the same synthetic RFPs, asserts
 * the two produce identical output, and times them.
 *
 * Run: node scripts/perf/dashboard-aggregate-bench.ts
 */
import {
  aggregateDashboard,
  computeCompletionPercentage,
  type AggregateCategory,
  type AggregateRequirement,
  type AggregateResponse,
} from "../../lib/dashboard/aggregate.ts";

// ---------------------------------------------------------------------------
// Synthetic RFP
// ---------------------------------------------------------------------------

const STATUSES = ["pending", "pass", "partial", "fail", "roadmap"] as const;

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface Dataset {
  categories: AggregateCategory[];
  requirements: AggregateRequirement[];
  responses: AggregateResponse[];
  supplierIds: string[];
  versionId: string;
}

function buildDataset(options: {
  categoryCount: number;
  requirementsPerCategory: number;
  supplierCount: number;
  seed?: number;
}): Dataset {
  const rng = makeRng(options.seed ?? 42);
  const versionId = "version-1";

  const categories: AggregateCategory[] = [];
  const requirements: AggregateRequirement[] = [];
  const responses: AggregateResponse[] = [];

  const supplierIds = Array.from(
    { length: options.supplierCount },
    (_, index) => `supplier-${index}`
  );

  for (let c = 0; c < options.categoryCount; c++) {
    const categoryId = `category-${c}`;
    categories.push({ id: categoryId, title: `Catégorie ${c}`, weight: 1 + c });

    // One level-3 parent per category, its children are the level-4 leaves.
    const parentId = `requirement-${c}-parent`;
    requirements.push({
      id: parentId,
      title: `Exigence parente ${c}`,
      level: 3,
      parent_id: null,
      category_id: categoryId,
      weight: 1,
    });

    for (let r = 0; r < options.requirementsPerCategory; r++) {
      const requirementId = `requirement-${c}-${r}`;
      requirements.push({
        id: requirementId,
        title: `Exigence ${c}.${r}`,
        level: 4,
        parent_id: parentId,
        category_id: categoryId,
        weight: 1,
      });

      for (const supplierId of supplierIds) {
        responses.push({
          requirement_id: requirementId,
          supplier_id: supplierId,
          version_id: versionId,
          status: STATUSES[Math.floor(rng() * STATUSES.length)],
          is_checked: rng() > 0.4,
          manual_score: rng() > 0.5 ? Math.round(rng() * 5) : null,
          ai_score: rng() > 0.3 ? Math.round(rng() * 5) : null,
          supplier: { name: `Fournisseur ${supplierId}` },
        });
      }
    }
  }

  return { categories, requirements, responses, supplierIds, versionId };
}

// ---------------------------------------------------------------------------
// Previous implementation (verbatim from the old route handler)
// ---------------------------------------------------------------------------

function legacyAggregate(input: {
  requirements: any[];
  categories: any[];
  allResponses: any[];
  suppliersFromVersion?: string[];
}) {
  const { requirements, categories, allResponses } = input;

  const totalRequirements = requirements.filter((r) => r.level === 4).length;

  const statusDistribution = {
    pass: allResponses.filter((r) => r.status === "pass").length,
    partial: allResponses.filter((r) => r.status === "partial").length,
    fail: allResponses.filter((r) => r.status === "fail").length,
    pending: allResponses.filter((r) => r.status === "pending").length,
    roadmap: allResponses.filter((r) => r.status === "roadmap").length,
  };

  const averageScores: Record<string, number> = {};
  allResponses.forEach((response) => {
    const supplierId = response.supplier_id;
    if (!averageScores[supplierId]) {
      averageScores[supplierId] = 0;
    }
    averageScores[supplierId] +=
      response.manual_score || response.ai_score || 0;
  });
  Object.keys(averageScores).forEach((supplierId) => {
    averageScores[supplierId] /= allResponses.filter(
      (r) => r.supplier_id === supplierId
    ).length;
  });

  const supplierNameMap = new Map<string, string>();
  let suppliers: string[];
  if (input.suppliersFromVersion) {
    suppliers = input.suppliersFromVersion;
    allResponses.forEach((response) => {
      if (!supplierNameMap.has(response.supplier_id)) {
        supplierNameMap.set(
          response.supplier_id,
          response.supplier?.name || `Fournisseur ${response.supplier_id}`
        );
      }
    });
  } else {
    suppliers = [...new Set(allResponses.map((r) => r.supplier_id))];
  }

  const suppliersData = suppliers.map((supplierId) => {
    const supplierResponses = allResponses.filter(
      (r) => r.supplier_id === supplierId
    );
    const supplierName =
      supplierNameMap.get(supplierId) ||
      supplierResponses[0]?.supplier.name ||
      `Fournisseur ${supplierId}`;

    const categoryScores: Record<string, number> = {};
    categories.forEach((category: any) => {
      const categoryReqs = requirements.filter(
        (r) => r.category_id === category.id
      );
      const categoryResponses = supplierResponses.filter((sr) =>
        categoryReqs.some((cr) => cr.id === sr.requirement_id)
      );
      const avgCategoryScore =
        categoryResponses.reduce(
          (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
          0
        ) / Math.max(categoryResponses.length, 1);
      categoryScores[category.id] = avgCategoryScore;
    });

    const totalScore = Object.values(categoryScores).reduce(
      (sum, score) => sum + score,
      0
    );

    return {
      supplierId,
      supplierName,
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
    suppliers: rankedSuppliers.map((s: any) => s.supplierName),
    categories: categories.map((c: any) => c.title),
    scores: rankedSuppliers.map((supplier: any) =>
      categories.map(
        (category: any) => supplier.categoryScores[category.id] || 0
      )
    ),
  };

  const avgTotalScore =
    rankedSuppliers.reduce((sum, s) => sum + s.totalScore, 0) /
    rankedSuppliers.length;
  const ranking = rankedSuppliers.map((supplier) => ({
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName,
    finalScore: supplier.totalScore,
    ranking: supplier.ranking,
    variation: ((supplier.totalScore - avgTotalScore) / avgTotalScore) * 100,
  }));

  const categoriesAnalysis = categories.map((category: any) => {
    const categoryReqs = requirements.filter(
      (r) => r.category_id === category.id
    );
    const categoryResponses = allResponses.filter((ar) =>
      categoryReqs.some((cr) => cr.id === ar.requirement_id)
    );
    const requirementCount = categoryReqs.length;
    const avgScore =
      categoryResponses.reduce(
        (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
        0
      ) / Math.max(categoryResponses.length, 1);
    const completionRate =
      (categoryResponses.filter((r) => r.is_checked).length /
        Math.max(categoryResponses.length, 1)) *
      100;

    return {
      id: category.id,
      title: category.title,
      currentWeight: category.weight || 1,
      requirementCount,
      averageScore: avgScore,
      completionRate,
    };
  });

  const requirementsByCategory: Record<string, any[]> = {};
  categories.forEach((category: any) => {
    const categoryReqs = requirements.filter(
      (r) => r.category_id === category.id
    );
    requirementsByCategory[category.id] = categoryReqs.map((req) => {
      const reqResponses = allResponses.filter(
        (ar) => ar.requirement_id === req.id
      );
      const avgScore =
        reqResponses.reduce(
          (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
          0
        ) / Math.max(reqResponses.length, 1);
      const checkedCount = reqResponses.filter((r) => r.is_checked).length;
      const totalCount = reqResponses.length;
      let status = "pending";
      if (checkedCount === totalCount && totalCount > 0) status = "pass";
      else if (checkedCount > 0 && checkedCount < totalCount)
        status = "partial";
      else if (checkedCount === 0 && totalCount > 0) status = "pending";

      return {
        id: req.id,
        title: req.title,
        currentWeight: req.weight || 1,
        averageScore: avgScore,
        status,
      };
    });
  });

  const weightsConfiguration = {
    categories: categories.map((cat: any) => ({
      id: cat.id,
      title: cat.title,
      currentWeight: cat.weight || 1,
      defaultWeight: cat.weight || 1,
    })),
    requirements: requirements.map((req) => ({
      id: req.id,
      title: req.title,
      categoryId: req.category_id || "",
      currentWeight: req.weight || 1,
      defaultWeight: req.weight || 1,
    })),
  };

  return {
    totalRequirements,
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

/** The JS half of the previous getRFPCompletionPercentage. */
function legacyCompletion(
  requirements: any[],
  responses: any[],
  activeSupplierIds: Set<string> | null
) {
  let filtered = responses;
  if (activeSupplierIds) {
    filtered = filtered.filter((r) => activeSupplierIds.has(r.supplier_id));
  }

  const parentIds = new Set(
    requirements.filter((r) => r.parent_id !== null).map((r) => r.parent_id)
  );
  const leafReqIds = new Set(
    requirements.filter((r) => !parentIds.has(r.id)).map((r) => r.id)
  );

  const leafResponses = filtered.filter((r) =>
    leafReqIds.has(r.requirement_id)
  );
  const total = leafResponses.length;
  if (total === 0) return 0;
  const checked = leafResponses.filter((r) => r.is_checked).length;
  return Math.round((checked / total) * 100);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function time(label: string, fn: () => unknown, runs: number) {
  fn(); // warm-up
  const started = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) fn();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6 / runs;
  return { label, elapsedMs };
}

let failures = 0;

function assertDeepEqual(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    console.log(`  ✓ ${label} identical to previous implementation`);
    return;
  }
  failures++;
  console.error(`  ✗ ${label} differs`);
  console.error(`    now:    ${a?.slice(0, 400)}`);
  console.error(`    before: ${b?.slice(0, 400)}`);
}

const scenarios = [
  {
    name: "petit RFP (10 catégories × 5 exigences × 4 fournisseurs)",
    categoryCount: 10,
    requirementsPerCategory: 5,
    supplierCount: 4,
    runs: 50,
  },
  {
    name: "RFP type (20 catégories × 10 exigences × 8 fournisseurs)",
    categoryCount: 20,
    requirementsPerCategory: 10,
    supplierCount: 8,
    runs: 20,
  },
  {
    name: "gros RFP (30 catégories × 20 exigences × 10 fournisseurs)",
    categoryCount: 30,
    requirementsPerCategory: 20,
    supplierCount: 10,
    runs: 5,
  },
];

for (const scenario of scenarios) {
  const dataset = buildDataset(scenario);
  const activeSupplierIds = new Set(dataset.supplierIds);

  console.log(`\n${scenario.name}`);
  console.log(
    `  ${dataset.requirements.length} exigences · ${dataset.responses.length} réponses`
  );

  const current = aggregateDashboard({
    requirements: dataset.requirements,
    categories: dataset.categories,
    responses: dataset.responses,
    activeSupplierIds,
    completion: { versionId: dataset.versionId, activeSupplierIds },
  });

  const legacy = legacyAggregate({
    requirements: dataset.requirements,
    categories: dataset.categories,
    allResponses: dataset.responses,
    suppliersFromVersion: dataset.supplierIds,
  });

  assertDeepEqual(
    "totalRequirements",
    current.totalRequirements,
    legacy.totalRequirements
  );
  assertDeepEqual(
    "statusDistribution",
    current.statusDistribution,
    legacy.statusDistribution
  );
  assertDeepEqual("averageScores", current.averageScores, legacy.averageScores);
  assertDeepEqual(
    "suppliersAnalysis",
    current.suppliersAnalysis,
    legacy.suppliersAnalysis
  );
  assertDeepEqual(
    "categoriesAnalysis",
    current.categoriesAnalysis,
    legacy.categoriesAnalysis
  );
  assertDeepEqual(
    "weightsConfiguration",
    current.weightsConfiguration,
    legacy.weightsConfiguration
  );
  assertDeepEqual(
    "completionPercentage",
    computeCompletionPercentage(dataset.requirements, dataset.responses, {
      versionId: dataset.versionId,
      activeSupplierIds,
    }),
    legacyCompletion(dataset.requirements, dataset.responses, activeSupplierIds)
  );

  const before = time(
    "avant",
    () =>
      legacyAggregate({
        requirements: dataset.requirements,
        categories: dataset.categories,
        allResponses: dataset.responses,
        suppliersFromVersion: dataset.supplierIds,
      }),
    scenario.runs
  );
  const after = time(
    "après",
    () =>
      aggregateDashboard({
        requirements: dataset.requirements,
        categories: dataset.categories,
        responses: dataset.responses,
        activeSupplierIds,
        completion: { versionId: dataset.versionId, activeSupplierIds },
      }),
    scenario.runs
  );

  console.log(
    `  temps CPU : ${before.elapsedMs.toFixed(1)} ms → ${after.elapsedMs.toFixed(1)} ms ` +
      `(×${(before.elapsedMs / after.elapsedMs).toFixed(1)} plus rapide)`
  );
}

if (failures > 0) {
  console.error(`\n${failures} écart(s) détecté(s).`);
  process.exit(1);
}
console.log("\nAucun écart : sortie identique à l'implémentation précédente.");
