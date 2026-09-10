"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequirementsTree, type TreeNode } from "@/hooks/use-requirements";
import { useResponsesLight, type ResponseLight } from "@/hooks/use-responses-light";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { useFinancialVersions, useFinancialSummary } from "@/hooks/use-financial-data";
import { aggregateNode, finalScore, type ResponseStatus } from "@/lib/scoring";

export interface SupplierRanking {
  id: string;
  name: string;
  /** Weighted technical score, 0–5. */
  score: number | null;
  rank: number;
  scored: number;
  total: number;
  statuses: Record<ResponseStatus, number>;
}

export interface DomainRow {
  id: string;
  code: string;
  title: string;
  weight: number;
  requirementCount: number;
  /** Per supplier id: weighted score and coverage. */
  cells: Record<string, { score: number | null; scored: number; total: number }>;
}

export interface FinancialRow {
  supplierId: string;
  supplierName: string;
  tco: number;
  setup: number;
  recurrent: number;
  rank: number;
}

export interface Weights {
  categories: Record<string, number>;
  requirements: Record<string, number>;
}

function useWeights(rfpId: string) {
  return useQuery<Weights, Error>({
    queryKey: ["weights", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/weights`);
      if (!res.ok) throw new Error("Les pondérations n'ont pas pu être chargées.");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function leafIdsOf(node: TreeNode): string[] {
  if (node.type === "requirement" && (!node.children || node.children.length === 0)) return [node.id];
  return (node.children ?? []).flatMap(leafIdsOf);
}

/**
 * Everything the decision view reads, computed once from four light reads:
 * the tree, the responses without their texts, the weights, the financial
 * summary. The weighted rule is the one of lib/scoring.
 */
export function useDecisionData(rfpId: string, tcoPeriod = 3) {
  const { activeVersion } = useVersion();
  const versionId = activeVersion?.id;
  const consultation = useConsultation(rfpId);
  const treeQuery = useRequirementsTree(rfpId);
  const lightQuery = useResponsesLight(rfpId, versionId);
  const weightsQuery = useWeights(rfpId);
  const financialVersions = useFinancialVersions(rfpId);
  const financialVersionIds = useMemo(
    () => (financialVersions.data ?? []).map((v) => v.id),
    [financialVersions.data]
  );
  const financialSummary = useFinancialSummary(rfpId, financialVersionIds, tcoPeriod);

  const tree = treeQuery.tree;
  const responses = lightQuery.data?.responses ?? [];
  const weights = weightsQuery.data;
  const suppliers = consultation.preparation?.suppliers.items ?? [];

  const computed = useMemo(() => {
    if (!weights || tree.length === 0) return null;
    const weightOf = (id: string) => weights.requirements[id] ?? weights.categories[id] ?? 1;

    const bySupplier = new Map<string, Map<string, ResponseLight>>();
    for (const r of responses) {
      let m = bySupplier.get(r.supplier_id);
      if (!m) {
        m = new Map();
        bySupplier.set(r.supplier_id, m);
      }
      m.set(r.requirement_id, r);
    }

    const root: TreeNode = { id: "root", type: "category", code: "", title: "", level: 0, children: tree };
    const domains = tree.filter((n) => n.type === "category");

    const ranking: SupplierRanking[] = suppliers.map((s) => {
      const m = bySupplier.get(s.id) ?? new Map<string, ResponseLight>();
      const scoreOf = (id: string) => {
        const r = m.get(id);
        return r ? finalScore(r) : null;
      };
      const agg = aggregateNode(root, scoreOf, weightOf);
      const statuses: Record<ResponseStatus, number> = { pass: 0, partial: 0, fail: 0, roadmap: 0, pending: 0 };
      m.forEach((r) => {
        statuses[r.status] = (statuses[r.status] ?? 0) + 1;
      });
      return { id: s.id, name: s.name, score: agg.score, rank: 0, scored: agg.scored, total: agg.total, statuses };
    });
    ranking.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    ranking.forEach((r, i) => (r.rank = i + 1));

    const domainRows: DomainRow[] = domains.map((d) => {
      const cells: DomainRow["cells"] = {};
      for (const s of suppliers) {
        const m = bySupplier.get(s.id) ?? new Map<string, ResponseLight>();
        const scoreOf = (id: string) => {
          const r = m.get(id);
          return r ? finalScore(r) : null;
        };
        const agg = aggregateNode(d, scoreOf, weightOf);
        cells[s.id] = { score: agg.score, scored: agg.scored, total: agg.total };
      }
      return {
        id: d.id,
        code: d.code,
        title: d.title,
        weight: weights.categories[d.id] ?? 1,
        requirementCount: leafIdsOf(d).length,
        cells,
      };
    });

    return { ranking, domainRows, bySupplier, weightOf };
  }, [weights, tree, responses, suppliers]);

  const financial: FinancialRow[] = useMemo(() => {
    const rows = (financialSummary.data ?? [])
      .map((s) => ({
        supplierId: s.supplier_id,
        supplierName: s.supplier_name,
        tco: s.tco,
        setup: s.total_setup,
        recurrent: s.total_recurrent_annual,
        rank: 0,
      }))
      .sort((a, b) => a.tco - b.tco);
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows;
  }, [financialSummary.data]);

  const bestTechnical = computed?.ranking.find((r) => r.score !== null) ?? null;
  const bestFinancial = financial[0] ?? null;

  const isLoading =
    consultation.isLoading || treeQuery.isLoading || lightQuery.isLoading || weightsQuery.isLoading;
  const error = (consultation.error ?? treeQuery.error ?? lightQuery.error ?? weightsQuery.error) as Error | null;

  return {
    rfpId,
    versionId,
    preparation: consultation.preparation,
    access: consultation.access,
    suppliers,
    tree,
    responses,
    ranking: computed?.ranking ?? [],
    domainRows: computed?.domainRows ?? [],
    bySupplier: computed?.bySupplier ?? new Map<string, Map<string, ResponseLight>>(),
    weightOf: computed?.weightOf ?? ((_id: string) => 1),
    financial,
    financialLoading: financialVersions.isLoading || financialSummary.isLoading,
    hasFinancial: financialVersionIds.length > 0,
    bestTechnical,
    bestFinancial,
    isLoading,
    error,
    refetch: () => {
      lightQuery.refetch();
      weightsQuery.refetch();
      treeQuery.refetch();
    },
  };
}
