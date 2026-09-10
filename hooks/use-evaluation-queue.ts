"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TreeNode } from "@/hooks/use-requirements";
import type { ResponseLight } from "@/hooks/use-responses-light";
import { finalScore, type ResponseStatus } from "@/lib/scoring";

export type QueueTab = "todo" | "done" | "all";

export interface QueueFilters {
  domains: string[];
  statuses: ResponseStatus[];
  scoreMin: number | null;
  scoreMax: number | null;
  hasQuestion: boolean;
  hasComment: boolean;
  hasOpenThread: boolean;
  supplierId: string | null;
  search: string;
}

export const EMPTY_FILTERS: QueueFilters = {
  domains: [],
  statuses: [],
  scoreMin: null,
  scoreMax: null,
  hasQuestion: false,
  hasComment: false,
  hasOpenThread: false,
  supplierId: null,
  search: "",
};

export interface QueueItem {
  id: string;
  code: string;
  title: string;
  domainId: string;
  domainCode: string;
  domainTitle: string;
  path: string;
  isMandatory: boolean;
  total: number;
  checked: number;
  /** Lowest final score across suppliers, null when nothing scored. */
  minScore: number | null;
  hasQuestion: boolean;
  hasComment: boolean;
}

export interface DomainGroup {
  id: string;
  code: string;
  title: string;
  items: QueueItem[];
}

const STORAGE_KEY = (rfpId: string) => `rfp-queue-filters-${rfpId}`;

function loadFilters(rfpId: string): QueueFilters {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(rfpId));
    return raw ? { ...EMPTY_FILTERS, ...JSON.parse(raw), search: "" } : EMPTY_FILTERS;
  } catch {
    return EMPTY_FILTERS;
  }
}

/** Flatten the tree into leaf requirements with their domain (level-1 category). */
export function flattenLeaves(tree: TreeNode[]) {
  const leaves: Array<Omit<QueueItem, "total" | "checked" | "minScore" | "hasQuestion" | "hasComment">> = [];
  const walk = (
    nodes: TreeNode[],
    domain: { id: string; code: string; title: string } | null,
    path: string[]
  ) => {
    for (const n of nodes) {
      if (n.type === "category") {
        const d = n.level === 1 || !domain ? { id: n.id, code: n.code, title: n.title } : domain;
        walk(n.children ?? [], d, [...path, n.code]);
      } else if (!n.children || n.children.length === 0) {
        leaves.push({
          id: n.id,
          code: n.code,
          title: n.title,
          domainId: domain?.id ?? "",
          domainCode: domain?.code ?? "",
          domainTitle: domain?.title ?? "Sans domaine",
          path: path.join(" › "),
          isMandatory: !!n.is_mandatory,
        });
      } else {
        walk(n.children, domain, [...path, n.code]);
      }
    }
  };
  walk(tree, null, []);
  return leaves;
}

/**
 * The expert's work queue: leaf requirements, their evaluation state derived
 * from the light responses, filtered and grouped by domain. Filters persist
 * per consultation in localStorage; the search does not.
 */
export function useEvaluationQueue(
  rfpId: string,
  tree: TreeNode[],
  responses: ResponseLight[],
  openThreadRequirementIds: Set<string>
) {
  const [tab, setTab] = useState<QueueTab>("todo");
  const [filters, setFiltersState] = useState<QueueFilters>(EMPTY_FILTERS);

  useEffect(() => {
    setFiltersState(loadFilters(rfpId));
  }, [rfpId]);

  const setFilters = useCallback(
    (update: Partial<QueueFilters>) => {
      setFiltersState((prev) => {
        const next = { ...prev, ...update };
        try {
          const { search: _s, ...persist } = next;
          window.localStorage.setItem(STORAGE_KEY(rfpId), JSON.stringify(persist));
        } catch {
          // storage unavailable
        }
        return next;
      });
    },
    [rfpId]
  );

  const resetFilters = useCallback(() => setFilters({ ...EMPTY_FILTERS }), [setFilters]);

  const leaves = useMemo(() => flattenLeaves(tree), [tree]);

  const byRequirement = useMemo(() => {
    const map = new Map<string, ResponseLight[]>();
    for (const r of responses) {
      if (filters.supplierId && r.supplier_id !== filters.supplierId) continue;
      const list = map.get(r.requirement_id);
      if (list) list.push(r);
      else map.set(r.requirement_id, [r]);
    }
    return map;
  }, [responses, filters.supplierId]);

  const items: QueueItem[] = useMemo(
    () =>
      leaves.map((leaf) => {
        const rs = byRequirement.get(leaf.id) ?? [];
        let minScore: number | null = null;
        let hasQuestion = false;
        let hasComment = false;
        let checked = 0;
        for (const r of rs) {
          if (r.is_checked) checked++;
          if (r.has_question) hasQuestion = true;
          if (r.has_manual_comment) hasComment = true;
          const s = finalScore(r);
          if (s !== null && (minScore === null || s < minScore)) minScore = s;
        }
        return { ...leaf, total: rs.length, checked, minScore, hasQuestion, hasComment };
      }),
    [leaves, byRequirement]
  );

  const domains = useMemo(() => {
    const seen = new Map<string, { id: string; code: string; title: string }>();
    for (const l of leaves) {
      if (!seen.has(l.domainId)) seen.set(l.domainId, { id: l.domainId, code: l.domainCode, title: l.domainTitle });
    }
    return Array.from(seen.values());
  }, [leaves]);

  const counts = useMemo(() => {
    let todo = 0;
    let done = 0;
    for (const it of items) {
      if (it.total > 0 && it.checked === it.total) done++;
      else todo++;
    }
    return { todo, done, all: items.length };
  }, [items]);

  const search = filters.search.trim().toLowerCase();

  const visible = useMemo(() => {
    const statusSet = new Set(filters.statuses);
    return items.filter((it) => {
      const isDone = it.total > 0 && it.checked === it.total;
      if (tab === "todo" && isDone) return false;
      if (tab === "done" && !isDone) return false;
      if (filters.domains.length > 0 && !filters.domains.includes(it.domainId)) return false;
      if (search && !it.code.toLowerCase().includes(search) && !it.title.toLowerCase().includes(search)) return false;
      if (filters.hasQuestion && !it.hasQuestion) return false;
      if (filters.hasComment && !it.hasComment) return false;
      if (filters.hasOpenThread && !openThreadRequirementIds.has(it.id)) return false;
      if (statusSet.size > 0 || filters.scoreMin !== null || filters.scoreMax !== null) {
        const rs = byRequirement.get(it.id) ?? [];
        const match = rs.some((r) => {
          if (statusSet.size > 0 && !statusSet.has(r.status)) return false;
          const s = finalScore(r);
          if (filters.scoreMin !== null && (s === null || s < filters.scoreMin)) return false;
          if (filters.scoreMax !== null && (s === null || s > filters.scoreMax)) return false;
          return true;
        });
        if (!match) return false;
      }
      return true;
    });
  }, [items, tab, filters, search, openThreadRequirementIds, byRequirement]);

  const groups: DomainGroup[] = useMemo(() => {
    const map = new Map<string, DomainGroup>();
    for (const it of visible) {
      const g = map.get(it.domainId) ?? { id: it.domainId, code: it.domainCode, title: it.domainTitle, items: [] };
      g.items.push(it);
      map.set(it.domainId, g);
    }
    return Array.from(map.values());
  }, [visible]);

  const activeFilterCount =
    filters.domains.length +
    filters.statuses.length +
    (filters.scoreMin !== null || filters.scoreMax !== null ? 1 : 0) +
    (filters.hasQuestion ? 1 : 0) +
    (filters.hasComment ? 1 : 0) +
    (filters.hasOpenThread ? 1 : 0) +
    (filters.supplierId ? 1 : 0);

  return {
    tab,
    setTab,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    items,
    visible,
    groups,
    domains,
    counts,
    byRequirement,
  };
}
