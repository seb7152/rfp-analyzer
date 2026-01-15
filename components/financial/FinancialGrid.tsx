"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { FinancialGridUIMode, FinancialGridPreferences, FinancialSummaryData } from "@/types/financial-grid";
import { FinancialTemplateLine } from "@/lib/financial/calculations";
import { ModeSelector } from "./ModeSelector";
import { ComparisonGrid } from "./ComparisonGrid";
import { SummaryTable } from "./SummaryTable";
import { toast } from "sonner";
import { Loader2, Grid } from "lucide-react";
import { useFinancialVersions } from "@/hooks/use-financial-data";

interface FinancialGridProps {
    rfpId: string;
    templateLines: FinancialTemplateLine[];
    templatePeriodYears: number;
    suppliers: { id: string; name: string }[];
}

export function FinancialGrid({ rfpId, templateLines, templatePeriodYears, suppliers }: FinancialGridProps) {
    const { data: allVersions = [] } = useFinancialVersions(rfpId);

    // State
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
    const [preferences, setPreferences] = useState<FinancialGridPreferences | null>(null);
    const [summaryData, setSummaryData] = useState<FinancialSummaryData[]>([]);
    const [isFetchingSummary, setIsFetchingSummary] = useState(false);

    // Initial load of preferences
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const res = await fetch(`/api/rfps/${rfpId}/financial-grid-preferences`);
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
    const savePreferences = useCallback(async (newPrefs: Partial<FinancialGridPreferences>) => {
        setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);

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
    }, [preferences, rfpId]);

    // Handle initial auto-selection if preferences are empty
    useEffect(() => {
        if (isLoadingPrefs || !preferences || (preferences.displayed_versions && Object.keys(preferences.displayed_versions).length > 0)) return;
        if (allVersions.length === 0 || suppliers.length === 0) return;

        const newDisplayedVersions: Record<string, string> = {};
        let changed = false;

        suppliers.forEach(s => {
            const supplierVersions = allVersions.filter(v => v.supplier_id === s.id);
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
            Object.entries(preferences.displayed_versions).forEach(([sid, vid]) => map.set(sid, vid));
        }
        return map;
    }, [preferences?.displayed_versions]);

    const handleModeChange = (mode: FinancialGridUIMode) => {
        savePreferences({ ui_mode: mode });
    };

    const handleVersionChange = (supplierId: string, versionId: string) => {
        const newDisplayedVersions = {
            ...(preferences?.displayed_versions || {}),
            [supplierId]: versionId
        };
        savePreferences({ displayed_versions: newDisplayedVersions });
    };

    // Fetch Summary Data when versions change
    useEffect(() => {
        const activeVersionsIds = Array.from(selectedVersionsMap.values());
        if (activeVersionsIds.length === 0) {
            setSummaryData([]);
            return;
        }

        const fetchSummary = async () => {
            setIsFetchingSummary(true);
            try {
                const params = new URLSearchParams();
                const safeTco = Number(preferences?.tco_period_years || templatePeriodYears || 3);
                params.set("tcoPeriod", safeTco.toString());
                params.set("versionIds", activeVersionsIds.join(","));

                const res = await fetch(`/api/rfps/${rfpId}/financial-summary?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setSummaryData(data.summary || []);
                }
            } catch (err) {
                console.error("Error fetching summary", err);
            } finally {
                setIsFetchingSummary(false);
            }
        };

        fetchSummary();
    }, [rfpId, selectedVersionsMap, preferences?.tco_period_years, templatePeriodYears]);

    if (isLoadingPrefs) return <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">Chargement de la grille financière...</p>
    </div>;

    const currentMode = preferences?.ui_mode || 'comparison';
    const effectiveTcoPeriod = Number(preferences?.tco_period_years || templatePeriodYears || 3);

    return (
        <div className="flex flex-col gap-6 h-full p-6 bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-inner">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-600">Vue :</span>
                        <ModeSelector mode={currentMode} onChange={handleModeChange} />
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    {isFetchingSummary ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Calcul des totaux...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Données synchronisées</span>
                        </div>
                    )}
                </div>
            </div>

            {currentMode === 'comparison' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Summary Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Synthèse Comparative</h3>
                        </div>
                        <SummaryTable
                            data={summaryData}
                            tcoPeriod={effectiveTcoPeriod}
                        />
                    </div>

                    {/* Main Grid Section */}
                    <div className="space-y-4 flex-1 min-h-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Détail des Coûts</h3>
                        </div>
                        <div className="border border-slate-200 rounded-2xl bg-white shadow-xl overflow-hidden flex-1 flex flex-col min-h-[500px]">
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

            {currentMode === 'supplier' && (
                <div className="flex-1 flex items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto">
                            <Grid className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Mode fournisseur</h3>
                        <p className="text-slate-500">
                            L'analyse détaillée par fournisseur arrive bientôt. Ce mode vous permettra de naviguer parmi toutes les versions d'un seul fournisseur et d'accéder à des KPIs spécifiques.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
