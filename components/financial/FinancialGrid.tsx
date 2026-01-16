"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FinancialGridUIMode,
  FinancialGridPreferences,
} from "@/types/financial-grid";
import { FinancialTemplateLine } from "@/lib/financial/calculations";
import { ModeSelector } from "./ModeSelector";
import { ComparisonGrid } from "./ComparisonGrid";
import { SummaryTable } from "./SummaryTable";
import { SupplierModeContent } from "./SupplierModeContent";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useFinancialVersions, useFinancialSummary } from "@/hooks/use-financial-data";
import { cn } from "@/lib/utils";

interface FinancialGridProps {
  rfpId: string;
  templateLines: FinancialTemplateLine[];
  templatePeriodYears: number;
  templateName?: string;
  suppliers: { id: string; name: string }[];
}

export function FinancialGrid({
  rfpId,
  templateLines,
  templatePeriodYears,
  templateName,
  suppliers,
}: FinancialGridProps) {
  const { data: allVersions = [] } = useFinancialVersions(rfpId);

  // State
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [preferences, setPreferences] =
    useState<FinancialGridPreferences | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  const currentMode = preferences?.ui_mode || "comparison";
  const effectiveTcoPeriod = Number(
    preferences?.tco_period_years || templatePeriodYears || 3
  );

  // Initial load of preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch(
          `/api/rfps/${rfpId}/financial-grid-preferences`
        );
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
        }
      } catch (err) {
        console.error("Error loading preferences", err);
      } finally {
        setIsLoadingPrefs(false);
      }
    };
    fetchPreferences();
  }, [rfpId]);

  // Update preferences
  const savePreferences = useCallback(
    async (newPrefs: Partial<FinancialGridPreferences>) => {
      setPreferences((prev) => (prev ? { ...prev, ...newPrefs } : null));

      try {
        await fetch(`/api/rfps/${rfpId}/financial-grid-preferences`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(preferences || {}),
            ...newPrefs,
          }),
        });
      } catch (err) {
        console.error("Failed to save preferences", err);
        toast.error("Erreur sauvegarde préférences");
      }
    },
    [preferences, rfpId]
  );

  // Handle initial auto-selection if preferences are empty
  useEffect(() => {
    if (
      isLoadingPrefs ||
      !preferences ||
      (preferences.displayed_versions &&
        Object.keys(preferences.displayed_versions).length > 0)
    )
      return;
    if (allVersions.length === 0 || suppliers.length === 0) return;

    const newDisplayedVersions: Record<string, string> = {};
    let changed = false;

    suppliers.forEach((s) => {
      const supplierVersions = allVersions.filter(
        (v) => v.supplier_id === s.id
      );
      if (supplierVersions.length > 0) {
        // Select most recent version
        newDisplayedVersions[s.id] = supplierVersions[0].id;
        changed = true;
      }
    });

    if (changed) {
      savePreferences({ displayed_versions: newDisplayedVersions });
    }
  }, [isLoadingPrefs, preferences, allVersions, suppliers, savePreferences]);

  // Convert preferences map to Map object for Grid
  const selectedVersionsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (preferences?.displayed_versions) {
      Object.entries(preferences.displayed_versions).forEach(([sid, vid]) =>
        map.set(sid, vid)
      );
    }
    return map;
  }, [preferences?.displayed_versions]);

  const handleModeChange = (mode: FinancialGridUIMode) => {
    savePreferences({ ui_mode: mode });
  };

  const handleVersionChange = (supplierId: string, versionId: string) => {
    const newDisplayedVersions = {
      ...(preferences?.displayed_versions || {}),
      [supplierId]: versionId,
    };
    savePreferences({ displayed_versions: newDisplayedVersions });
  };

  // Summary Hook
  const activeVersionsIds = useMemo(
    () => Array.from(selectedVersionsMap.values()),
    [selectedVersionsMap]
  );

  const { data: rawSummaryData = [], isLoading: isFetchingSummary } =
    useFinancialSummary(rfpId, activeVersionsIds, effectiveTcoPeriod);

  // Sort summary data to match suppliers order
  const summaryData = useMemo(() => {
    if (!rawSummaryData || rawSummaryData.length === 0) return [];

    // Create a map for sorting
    const supplierIndices = new Map(suppliers.map((s, i) => [s.id, i]));

    return [...rawSummaryData].sort((a, b) => {
      const indexA = supplierIndices.get(a.supplier_id) ?? 999;
      const indexB = supplierIndices.get(b.supplier_id) ?? 999;
      return indexA - indexB;
    });
  }, [rawSummaryData, suppliers]);

  const [referenceSupplierId, setReferenceSupplierId] = useState<string | null>(
    null
  );

  const handleSupplierHeaderClick = (supplierId: string) => {
    if (referenceSupplierId === supplierId) {
      setReferenceSupplierId(null);
    } else {
      setReferenceSupplierId(supplierId);
    }
  };

  if (isLoadingPrefs)
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">
          Chargement de la grille financière...
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-inner">
      {/* Consolidated Header Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {templateName || "Structure de coûts"}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 font-medium">
                Période TCO: {effectiveTcoPeriod} an
                {effectiveTcoPeriod > 1 ? "s" : ""}
              </span>
              {isFetchingSummary ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span>Calcul...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span>Synchronisé</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeSelector mode={currentMode} onChange={handleModeChange} />
          </div>
        </div>
      </div>

      {currentMode === "comparison" && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Summary Section - Collapsible */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Synthèse Comparative
                </h3>
                <div className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
                  TCO {effectiveTcoPeriod} ans
                </div>
              </div>
              {isSummaryExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isSummaryExpanded
                  ? "max-h-[1000px] opacity-100"
                  : "max-h-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="p-4 pt-0">
                <SummaryTable
                  data={summaryData}
                  tcoPeriod={effectiveTcoPeriod}
                  referenceSupplierId={referenceSupplierId}
                  onSupplierHeaderClick={handleSupplierHeaderClick}
                />
              </div>
            </div>
          </div>

          {/* Main Grid Section */}
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-slate-900 tracking-tight ml-1">
                Détail des Coûts
              </h3>
            </div>
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xl overflow-hidden flex-1 flex flex-col min-h-[600px]">
              <ComparisonGrid
                rfpId={rfpId}
                templateLines={templateLines}
                suppliers={suppliers}
                tcoPeriod={effectiveTcoPeriod}
                selectedVersions={selectedVersionsMap}
                onVersionChange={handleVersionChange}
              />
            </div>
          </div>
        </div>
      )}

      {currentMode === "supplier" && (
        <SupplierModeContent
          rfpId={rfpId}
          templateLines={templateLines}
          suppliers={suppliers}
          allVersions={allVersions}
          selectedSupplierId={preferences?.selected_supplier_id || null}
          onSupplierChange={(supplierId) =>
            savePreferences({ selected_supplier_id: supplierId })
          }
          tcoPeriod={effectiveTcoPeriod}
        />
      )}
    </div>
  );
}
