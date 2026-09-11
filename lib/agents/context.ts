/**
 * Loading what an analysis needs from the database: the domain subtree with
 * its leaf requirements, the supplier's answers on a version, the active
 * suppliers of a version. Works with either the user client (RLS) or the
 * service client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainDescription, DomainLeaf } from "./prompt";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, any, any>;

export interface CategoryRow {
  id: string;
  code: string;
  title: string;
  parent_id: string | null;
  level: number;
  display_order: number | null;
}

export async function loadCategories(db: Db, rfpId: string): Promise<CategoryRow[]> {
  const { data, error } = await db
    .from("categories")
    .select("id, code, title, parent_id, level, display_order")
    .eq("rfp_id", rfpId)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`Domaines illisibles : ${error.message}`);
  return (data ?? []) as CategoryRow[];
}

/** Ids of a category and all its descendants, in display order. */
export function subtreeIds(categories: CategoryRow[], rootId: string): string[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  const out: string[] = [];
  const walk = (id: string) => {
    out.push(id);
    for (const child of byParent.get(id) ?? []) walk(child.id);
  };
  walk(rootId);
  return out;
}

export interface LeafRow {
  id: string;
  requirement_id_external: string;
  title: string;
  description: string | null;
  context: string | null;
  is_mandatory: boolean;
  category_id: string | null;
  display_order: number | null;
}

export async function loadLeaves(db: Db, rfpId: string, categoryIds: string[]): Promise<LeafRow[]> {
  if (categoryIds.length === 0) return [];
  const { data, error } = await db
    .from("requirements")
    .select("id, requirement_id_external, title, description, context, is_mandatory, category_id, display_order")
    .eq("rfp_id", rfpId)
    .in("category_id", categoryIds)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`Exigences illisibles : ${error.message}`);
  return (data ?? []) as LeafRow[];
}

/**
 * The domain as the model reads it: the assigned category, its sub-domains,
 * its leaf requirements grouped in display order of the subtree.
 */
export function describeDomain(categories: CategoryRow[], rootId: string, leaves: LeafRow[]): DomainDescription {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const root = byId.get(rootId);
  if (!root) throw new Error("Domaine introuvable.");
  const ids = subtreeIds(categories, rootId);
  const depthOf = new Map<string, number>();
  const pathOf = new Map<string, string[]>();
  for (const id of ids) {
    const c = byId.get(id)!;
    if (id === rootId) {
      depthOf.set(id, 0);
      pathOf.set(id, []);
    } else {
      const parentDepth = depthOf.get(c.parent_id ?? "") ?? 0;
      depthOf.set(id, parentDepth + 1);
      pathOf.set(id, [...(pathOf.get(c.parent_id ?? "") ?? []), c.code]);
    }
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  const sortedLeaves = [...leaves].sort((a, b) => {
    const ca = order.get(a.category_id ?? "") ?? 0;
    const cb = order.get(b.category_id ?? "") ?? 0;
    if (ca !== cb) return ca - cb;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
  const domainLeaves: DomainLeaf[] = sortedLeaves.map((l) => ({
    id: l.id,
    code: l.requirement_id_external,
    title: l.title,
    description: l.description,
    context: l.context,
    is_mandatory: l.is_mandatory,
    path: pathOf.get(l.category_id ?? "") ?? [],
  }));
  return {
    code: root.code,
    title: root.title,
    categories: ids
      .filter((id) => id !== rootId)
      .map((id) => {
        const c = byId.get(id)!;
        return { id, code: c.code, title: c.title, depth: (depthOf.get(id) ?? 1) - 1 };
      }),
    leaves: domainLeaves,
  };
}

export interface ResponseRow {
  id: string;
  requirement_id: string;
  response_text: string | null;
}

export async function loadResponses(
  db: Db,
  versionId: string,
  supplierId: string,
  requirementIds: string[]
): Promise<Map<string, ResponseRow>> {
  const map = new Map<string, ResponseRow>();
  if (requirementIds.length === 0) return map;
  const { data, error } = await db
    .from("responses")
    .select("id, requirement_id, response_text")
    .eq("version_id", versionId)
    .eq("supplier_id", supplierId)
    .in("requirement_id", requirementIds);
  if (error) throw new Error(`Réponses illisibles : ${error.message}`);
  for (const r of (data ?? []) as ResponseRow[]) map.set(r.requirement_id, r);
  return map;
}

export interface SupplierRow {
  id: string;
  name: string;
  supplier_id_external: string;
}

/** Suppliers still active on a version: those not removed from it. */
export async function loadActiveSuppliers(db: Db, rfpId: string, versionId: string): Promise<SupplierRow[]> {
  const [{ data: suppliers, error }, { data: statuses, error: statusError }] = await Promise.all([
    db.from("suppliers").select("id, name, supplier_id_external").eq("rfp_id", rfpId).order("name"),
    db.from("version_supplier_status").select("supplier_id, shortlist_status").eq("version_id", versionId),
  ]);
  if (error) throw new Error(`Fournisseurs illisibles : ${error.message}`);
  if (statusError) throw new Error(`Statuts de version illisibles : ${statusError.message}`);
  const removed = new Set(
    ((statuses ?? []) as Array<{ supplier_id: string; shortlist_status: string }>)
      .filter((s) => s.shortlist_status === "removed")
      .map((s) => s.supplier_id)
  );
  return ((suppliers ?? []) as SupplierRow[]).filter((s) => !removed.has(s.id));
}

export async function loadActiveVersion(db: Db, rfpId: string): Promise<{ id: string; version_number: number; version_name: string } | null> {
  const { data, error } = await db
    .from("evaluation_versions")
    .select("id, version_number, version_name")
    .eq("rfp_id", rfpId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Version active illisible : ${error.message}`);
  return data ?? null;
}

/** Splits a list into chunks of `size`, the last one possibly shorter. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
