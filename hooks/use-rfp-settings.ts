"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RFP, VersionDetailResponse } from "@/lib/supabase/types";

/**
 * Data of the consultation settings page. Every write invalidates the
 * caches the rest of the shell reads (preparation, assignments, versions),
 * so the rail and the follow-up page never lag behind.
 */

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export type RfpAccessLevel = "owner" | "evaluator" | "viewer";

export interface RfpAssignment {
  id: string;
  rfp_id: string;
  user_id: string;
  access_level: RfpAccessLevel;
  assigned_at: string;
  user: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface OrgMember {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "evaluator" | "viewer";
}

export function useRfpAssignments(rfpId: string) {
  return useQuery<{ assignments: RfpAssignment[] }, Error>({
    queryKey: ["assignments", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/assignments`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Les analystes n'ont pas pu être chargés."));
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useOrgMembers(organizationId: string | null) {
  return useQuery<{ members: OrgMember[] }, Error>({
    queryKey: ["org-members", organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Les membres n'ont pas pu être chargés."));
      return res.json();
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

export function useAssignmentMutations(rfpId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["assignments", rfpId] });
    queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
  };
  const add = useMutation<void, Error, { user_id: string; access_level: RfpAccessLevel }>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/rfps/${rfpId}/assignments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "L'analyste n'a pas pu être ajouté."));
    },
    onSuccess: invalidate,
  });
  const changeRole = useMutation<void, Error, { user_id: string; access_level: RfpAccessLevel }>({
    mutationFn: async ({ user_id, access_level }) => {
      const res = await fetch(`/api/rfps/${rfpId}/assignments/${user_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_level }),
      });
      if (!res.ok) throw new Error(await readError(res, "Le rôle n'a pas pu être changé."));
    },
    onSuccess: invalidate,
  });
  const remove = useMutation<void, Error, { user_id: string }>({
    mutationFn: async ({ user_id }) => {
      const res = await fetch(`/api/rfps/${rfpId}/assignments/${user_id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "L'analyste n'a pas pu être retiré."));
    },
    onSuccess: invalidate,
  });
  return { add, changeRole, remove };
}

/** Status, peer review or organisation of the consultation. */
export function useRfpPatch(rfpId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ rfp: Partial<RFP> }, Error, Partial<Pick<RFP, "status" | "peer_review_enabled" | "organization_id">>>({
    mutationFn: async (patch) => {
      const res = await fetch(`/api/rfps/${rfpId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readError(res, "Le réglage n'a pas été enregistré."));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["rfp", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["rfps"] });
    },
  });
}

export function useVersionDetail(rfpId: string, versionId: string | null) {
  return useQuery<VersionDetailResponse, Error>({
    queryKey: ["version-detail", rfpId, versionId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/versions/${versionId}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "La version n'a pas pu être chargée."));
      return res.json();
    },
    enabled: !!versionId,
    staleTime: 30_000,
  });
}

export function useSupplierStatusMutation(rfpId: string, versionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { supplierId: string; status: "active" | "removed"; reason?: string }>({
    mutationFn: async ({ supplierId, status, reason }) => {
      if (!versionId) throw new Error("Aucune version active.");
      const res = await fetch(`/api/rfps/${rfpId}/versions/${versionId}/suppliers/${supplierId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_status: status, removal_reason: reason }),
      });
      if (!res.ok) throw new Error(await readError(res, "Le statut du fournisseur n'a pas été enregistré."));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["version-detail", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["decision", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["responses", rfpId] });
    },
  });
}

export interface CreateVersionInput {
  version_name: string;
  description?: string;
  copy_from_version_id?: string;
  inherit_supplier_status?: boolean;
}

export function useVersionMutations(rfpId: string, refreshVersions: () => Promise<void>) {
  const queryClient = useQueryClient();
  const after = async () => {
    await refreshVersions();
    queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
    queryClient.invalidateQueries({ queryKey: ["version-detail", rfpId] });
  };
  const create = useMutation<void, Error, CreateVersionInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/rfps/${rfpId}/versions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "La version n'a pas pu être créée."));
    },
    onSuccess: after,
  });
  const rename = useMutation<void, Error, { versionId: string; version_name: string; description: string }>({
    mutationFn: async ({ versionId, ...body }) => {
      const res = await fetch(`/api/rfps/${rfpId}/versions/${versionId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res, "La version n'a pas pu être renommée."));
    },
    onSuccess: after,
  });
  return { create, rename };
}
