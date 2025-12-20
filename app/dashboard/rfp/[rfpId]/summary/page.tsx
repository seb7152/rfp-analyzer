"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/RFPSummary/KPICard";
import { SuppliersTab } from "@/components/RFPSummary/SuppliersTab";
import { AnalystsTab } from "@/components/RFPSummary/AnalystsTab";
import { AnalysisTab } from "@/components/RFPSummary/AnalysisTab";
import { CategoryAnalysisTable } from "@/components/RFPSummary/CategoryAnalysisTable";
import { WeightsTab } from "@/components/RFPSummary/WeightsTab";
import { RequirementsTab } from "@/components/RFPSummary/RequirementsTab";
import { ExportTab } from "@/components/RFPSummary/ExportTab";
import { VersionsTab } from "@/components/RFPSummary/VersionsTab";
import { PresentationTranscriptImport } from "@/components/RFPSummary/PresentationTranscriptImport";
import { PresentationReport } from "@/components/RFPSummary/PresentationReport";

import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { DocxImportModal } from "@/components/DocxImportModal";

import {
  Building2,
  Users,
  CheckCircle2,
  File,
  FileText,
  Activity,
  Zap,
  FileUp,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Sliders,
  ListChecks,
  Download,
  GitBranch,
  FileJson,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";

interface RFPSummaryData {
  rfp: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    analysis_settings?: Record<string, unknown> | null;
  };
  globalProgress: {
    completionPercentage: number;
    totalRequirements: number;
    evaluatedRequirements: number;
    statusDistribution: {
      pass: number;
      partial: number;
      fail: number;
      pending: number;
    };
    averageScores: Record<string, number>;
  };
  suppliersAnalysis: {
    comparisonTable: Array<{
      supplierId: string;
      supplierName: string;
    }>;
  };
}

export default function RFPSummaryPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const [data, setData] = useState<RFPSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [expandDashboard, setExpandDashboard] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDocxImportModalOpen, setIsDocxImportModalOpen] = useState(false);
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [presentationTab, setPresentationTab] = useState<"import" | "report">("import");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/rfps/${rfpId}/dashboard`);
        if (!response.ok) throw new Error("Failed to fetch RFP summary");

        const summaryData = await response.json();
        setData(summaryData);

        // Set RFP title
        if (summaryData.rfp?.title) {
          setRfpTitle(summaryData.rfp.title);
        }

        // Fetch total documents count
        try {
          const docsResponse = await fetch(`/api/rfps/${rfpId}/documents`);
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            setTotalDocuments(docsData.count || 0);
          }
        } catch {
          // Documents fetch error, continue without it
        }

        // Fetch suppliers
        try {
          const suppliersResponse = await fetch(`/api/rfps/${rfpId}/suppliers`);
          if (suppliersResponse.ok) {
            const suppliersData = await suppliersResponse.json();
            setSuppliers(suppliersData.suppliers || []);
          }
        } catch {
          // Suppliers fetch error, continue without it
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    if (rfpId) {
      fetchData();
    }
  }, [rfpId]);

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        {/* Navigation */}
        <nav className="flex flex-wrap gap-3 items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
              title="Ajouter des documents PDF"
            >
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Importer</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 font-normal"
                    onClick={() => setIsDocxImportModalOpen(true)}
                  >
                    <FileText className="h-4 w-4" />
                    Importer depuis DOCX
                  </Button>
                  <Link href={`/dashboard/rfp/${rfpId}/import`}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 font-normal"
                    >
                      <FileJson className="h-4 w-4" />
                      Importer depuis JSON
                    </Button>
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exporter JSON</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={async () => {
                      try {
                        // Fetch tree data on demand
                        const response = await fetch(`/api/rfps/${rfpId}/tree`);
                        if (!response.ok)
                          throw new Error("Failed to fetch data");
                        const treeData = await response.json();

                        // Export Structure (Categories)
                        const exportData: any[] = [];
                        const traverse = (nodes: any[]) => {
                          for (const node of nodes) {
                            if (node.type === "category") {
                              exportData.push({
                                id: node.id,
                                code: node.code,
                                title: node.title,
                                short_name: node.short_name || node.title,
                                level: node.level,
                                parent_id: getParentId(node.id, treeData),
                              });
                              if (node.children) traverse(node.children);
                            }
                          }
                        };

                        // Helper to find parent
                        const getParentId = (
                          targetId: string,
                          nodes: any[],
                          parentId: string | null = null
                        ): string | null => {
                          for (const node of nodes) {
                            if (node.id === targetId) return parentId;
                            if (node.children) {
                              const found = getParentId(
                                targetId,
                                node.children,
                                node.id
                              );
                              if (found !== null) return found;
                            }
                          }
                          return null;
                        };

                        traverse(treeData);

                        const jsonString = JSON.stringify(
                          { categories: exportData },
                          null,
                          2
                        );
                        const blob = new Blob([jsonString], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `rfp-${rfpId}-structure.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Export error:", error);
                        alert("Erreur lors de l'export");
                      }
                    }}
                  >
                    Structure (Catégories)
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={async () => {
                      try {
                        // Fetch tree data & weights on demand
                        const [treeResponse, weightsResponse] =
                          await Promise.all([
                            fetch(`/api/rfps/${rfpId}/tree`),
                            fetch(`/api/rfps/${rfpId}/weights`),
                          ]);

                        if (!treeResponse.ok)
                          throw new Error("Failed to fetch tree");
                        const treeData = await treeResponse.json();

                        let weightsData: {
                          categories?: Record<string, number>;
                          requirements?: Record<string, number>;
                        } = {};
                        if (weightsResponse.ok) {
                          weightsData = await weightsResponse.json();
                        }

                        // Reconstruct real weights map
                        const allRealWeights = new Map<string, number>();
                        if (weightsData) {
                          // @ts-ignore
                          for (const [id, weight] of Object.entries(
                            weightsData.categories || {}
                          )) {
                            // @ts-ignore
                            allRealWeights.set(id, weight * 100);
                          }
                          // @ts-ignore
                          for (const [id, weight] of Object.entries(
                            weightsData.requirements || {}
                          )) {
                            // @ts-ignore
                            allRealWeights.set(id, weight * 100);
                          }
                        }

                        // Helper to calculate weight if not in DB (fallback to equal distribution logic or just 0)
                        // For export, we prefer DB weights. If missing, we might need to recalculate or just export 0.
                        // Let's try to recalculate if missing, similar to WeightsTab logic, but simplified.

                        const calculateRealWeight = (
                          nodeId: string
                        ): number => {
                          // If we have it in DB, use it (converted back to %)
                          if (allRealWeights.has(nodeId))
                            return allRealWeights.get(nodeId)!;
                          return 0; // Fallback
                        };

                        // Export Requirements
                        const exportData: any[] = [];
                        const traverse = (
                          nodes: any[],
                          parentCategoryCode: string = ""
                        ) => {
                          for (const node of nodes) {
                            if (node.type === "category") {
                              if (node.children)
                                traverse(node.children, node.code);
                            } else if (node.type === "requirement") {
                              const realWeight = calculateRealWeight(node.id);
                              exportData.push({
                                code: node.code,
                                title: node.title,
                                description: node.description || "",
                                weight: Number((realWeight / 100).toFixed(4)),
                                category_name: parentCategoryCode,
                                is_mandatory: node.is_mandatory,
                                is_optional: node.is_optional,
                              });
                            }
                          }
                        };
                        traverse(treeData);

                        const jsonString = JSON.stringify(
                          { requirements: exportData },
                          null,
                          2
                        );
                        const blob = new Blob([jsonString], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `rfp-${rfpId}-requirements.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Export error:", error);
                        alert("Erreur lors de l'export");
                      }
                    }}
                  >
                    Données (Exigences)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            {data?.rfp && (
              <AIAnalysisButton
                rfp={data.rfp as any} // Type assertion needed because RFPSummaryData.rfp is a subset of RFP
                responsesCount={
                  (data.globalProgress.statusDistribution.pass || 0) +
                  (data.globalProgress.statusDistribution.partial || 0) +
                  (data.globalProgress.statusDistribution.fail || 0) +
                  (data.globalProgress.statusDistribution.pending || 0)
                }
                hasUnanalyzedResponses={
                  (data.globalProgress.statusDistribution.pending || 0) > 0
                }
                onAnalysisStarted={() => {
                  // Optional: refresh data or show toast
                }}
              />
            )}
            <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>
              <Button variant="primary" size="sm" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Évaluer</span>
              </Button>
            </Link>
          </div>
        </nav>

        {/* Header */}
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          {loading ? (
            <>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                RFP
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                {data?.rfp.title}
              </h1>
              {data?.rfp.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {data.rfp.description}
                </p>
              )}
            </div>
          )}
        </header>

        {/* Tabs */}
        <section className="space-y-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="flex w-full gap-8 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Tableau de bord</span>
              </TabsTrigger>
              <TabsTrigger
                value="weights"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:inline">Pondérations</span>
              </TabsTrigger>
              <TabsTrigger
                value="analysts"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Analystes</span>
              </TabsTrigger>
              <TabsTrigger
                value="requirements"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Exigences</span>
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Analyse</span>
              </TabsTrigger>
              <TabsTrigger
                value="soutenances"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Presentation className="h-4 w-4" />
                <span className="hidden sm:inline">Soutenances</span>
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
              <TabsTrigger
                value="versions"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Versions</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </>
              ) : data ? (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <KPICard
                      label="Exigences"
                      value={data.globalProgress.totalRequirements}
                      icon={<FileText className="h-5 w-5" />}
                      hint="Nombre total de requirements"
                    />
                    <KPICard
                      label="Répondants"
                      value={data.suppliersAnalysis.comparisonTable.length}
                      icon={<Building2 className="h-5 w-5" />}
                      hint="Fournisseurs participants"
                    />
                    <KPICard
                      label="Avancement"
                      value={`${Math.round(data.globalProgress.completionPercentage)}%`}
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      subtitle={`${data.globalProgress.evaluatedRequirements}/${data.globalProgress.totalRequirements}`}
                      hint="Progression d'évaluation"
                    />
                    <KPICard
                      label="Documents"
                      value={totalDocuments}
                      icon={<File className="h-5 w-5" />}
                      hint="Fichiers uploadés"
                    />
                  </div>

                  {/* Suppliers Table with Expand/Collapse */}
                  <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandDashboard(!expandDashboard)}
                          className="gap-2"
                        >
                          {expandDashboard ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {expandDashboard && <SuppliersTab rfpId={rfpId} />}
                    </div>
                  </Card>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="weights" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <WeightsTab rfpId={rfpId} />
              )}
            </TabsContent>

            <TabsContent value="analysts" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <AnalystsTab rfpId={rfpId} />
              )}
            </TabsContent>

            <TabsContent value="requirements" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <RequirementsTab rfpId={rfpId} />
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <AnalysisTab rfpId={rfpId} />
              )}
            </TabsContent>

            <TabsContent value="soutenances" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <div className="space-y-6">
                  {/* Presentation sub-tabs */}
                  <Tabs
                    value={presentationTab}
                    onValueChange={(value) =>
                      setPresentationTab(value as "import" | "report")
                    }
                    className="w-full"
                  >
                    <TabsList className="flex w-full gap-8 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
                      <TabsTrigger
                        value="import"
                        className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
                      >
                        <FileUp className="h-4 w-4" />
                        <span>Importer transcripts</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="report"
                        className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Compte rendu</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="import" className="space-y-6 mt-6">
                      <PresentationTranscriptImport
                        rfpId={rfpId}
                        suppliers={suppliers}
                      />
                    </TabsContent>

                    <TabsContent value="report" className="space-y-6 mt-6">
                      <PresentationReport rfpId={rfpId} suppliers={suppliers} />
                    </TabsContent>
                  </Tabs>

                  {/* Original CategoryAnalysisTable (Defense analysis) */}
                  <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Analyse des défenses de catégorie
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Résultats de l'analyse IA par catégorie
                      </p>
                    </div>
                    <CategoryAnalysisTable rfpId={rfpId} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <ExportTab rfpId={rfpId} />
              )}
            </TabsContent>
            <TabsContent value="versions" className="space-y-6">
              <VersionsTab rfpId={rfpId} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Document Upload Modal */}
        <DocumentUploadModal
          rfpId={rfpId}
          rfpTitle={rfpTitle}
          isOpen={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
        />

        {/* DOCX Import Modal */}
        <DocxImportModal
          rfpId={rfpId}
          isOpen={isDocxImportModalOpen}
          onOpenChange={setIsDocxImportModalOpen}
        />
      </div>
    </div>
  );
}
