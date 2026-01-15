import type { SupabaseClient } from "@supabase/supabase-js";

type VersionSupplierStatusRow = {
  supplier_id: string;
  shortlist_status: string | null;
  is_active: boolean | null;
};

type CacheEntry = {
  statuses: VersionSupplierStatusRow[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

export async function getVersionSupplierStatuses(
  supabase: SupabaseClient,
  versionId: string
): Promise<VersionSupplierStatusRow[]> {
  const cached = cache.get(versionId);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.statuses;
  }

  const { data, error } = await supabase
    .from("version_supplier_status")
    .select("supplier_id, shortlist_status, is_active")
    .eq("version_id", versionId);

  if (error) {
    console.error("Error fetching version supplier statuses:", error);
    return [];
  }

  const statuses = data || [];
  cache.set(versionId, { statuses, fetchedAt: now });

  return statuses;
}

export function getActiveSupplierIds(
  statuses: VersionSupplierStatusRow[]
): Set<string> {
  return new Set(
    statuses
      .filter(
        (status) =>
          (status.is_active ?? true) &&
          (status.shortlist_status ?? "active") !== "removed"
      )
      .map((status) => status.supplier_id)
  );
}

export type { VersionSupplierStatusRow };
