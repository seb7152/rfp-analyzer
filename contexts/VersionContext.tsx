"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { EvaluationVersionWithStats } from "@/lib/supabase/types";

interface VersionContextType {
  versions: EvaluationVersionWithStats[];
  activeVersion: EvaluationVersionWithStats | null;
  isLoading: boolean;
  error: string | null;
  setActiveVersionId: (versionId: string) => Promise<void>;
  refreshVersions: () => Promise<void>;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

interface VersionProviderProps {
  children: React.ReactNode;
  rfpId: string;
}

export const VersionProvider: React.FC<VersionProviderProps> = ({
  children,
  rfpId,
}) => {
  const [versions, setVersions] = useState<EvaluationVersionWithStats[]>([]);
  const [activeVersion, setActiveVersion] =
    useState<EvaluationVersionWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/rfps/${rfpId}/versions`);
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }

      const data = await response.json();
      const versionList = data.versions || [];
      setVersions(versionList);

      // Set active version (find is_active = true)
      const active = versionList.find(
        (v: EvaluationVersionWithStats) => v.is_active
      );
      setActiveVersion(active || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error fetching versions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveVersionId = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/versions/${versionId}/activate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to activate version");
      }

      await fetchVersions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error setting active version:", err);
      throw err;
    }
  };

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, [rfpId]);

  return (
    <VersionContext.Provider
      value={{
        versions,
        activeVersion,
        isLoading,
        error,
        setActiveVersionId,
        refreshVersions: fetchVersions,
      }}
    >
      {children}
    </VersionContext.Provider>
  );
};

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error("useVersion must be used within a VersionProvider");
  }
  return context;
}
