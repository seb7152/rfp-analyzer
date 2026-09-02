"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EvaluationVersionWithStats } from "@/lib/supabase/types";

interface VersionContextType {
  versions: EvaluationVersionWithStats[];
  activeVersion: EvaluationVersionWithStats | null;
  isLoading: boolean;
  error: string | null;
  setActiveVersionId: (versionId: string) => Promise<void>;
  refreshVersions: () => Promise<void>;
}

export const VersionContext = createContext<VersionContextType | undefined>(
  undefined
);

interface VersionProviderProps {
  children: React.ReactNode;
  rfpId: string;
}

export const versionsQueryKey = (rfpId: string) => ["rfp-versions", rfpId];

/**
 * Evaluation versions for the current RFP.
 *
 * The provider is mounted by the dashboard layout, so it remounts on every
 * navigation between an RFP's tabs. Backing it with React Query keeps the
 * version list across those navigations instead of re-running the (previously
 * N+1) `/versions` request each time.
 */
export const VersionProvider: React.FC<VersionProviderProps> = ({
  children,
  rfpId,
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<
    EvaluationVersionWithStats[],
    Error
  >({
    queryKey: versionsQueryKey(rfpId),
    queryFn: async () => {
      const response = await fetch(`/api/rfps/${rfpId}/versions`);
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const payload = await response.json();
      return (payload.versions || []) as EvaluationVersionWithStats[];
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 2,
  });

  const versions = useMemo(() => data ?? [], [data]);
  const activeVersion = useMemo(
    () => versions.find((version) => version.is_active) || null,
    [versions]
  );

  const refreshVersions = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const setActiveVersionId = useCallback(
    async (versionId: string) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/versions/${versionId}/activate`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Failed to activate version");
      }

      await queryClient.invalidateQueries({
        queryKey: versionsQueryKey(rfpId),
      });
    },
    [queryClient, rfpId]
  );

  const value = useMemo(
    () => ({
      versions,
      activeVersion,
      isLoading,
      error: error ? error.message : null,
      setActiveVersionId,
      refreshVersions,
    }),
    [
      versions,
      activeVersion,
      isLoading,
      error,
      setActiveVersionId,
      refreshVersions,
    ]
  );

  return (
    <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
  );
};

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error("useVersion must be used within a VersionProvider");
  }
  return context;
}
