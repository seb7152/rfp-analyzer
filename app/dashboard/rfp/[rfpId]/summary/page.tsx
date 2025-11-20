"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/RFPSummary/KPICard";
import { SuppliersTab } from "@/components/RFPSummary/SuppliersTab";
import { AnalystsTab } from "@/components/RFPSummary/AnalystsTab";
import { AnalysisTab } from "@/components/RFPSummary/AnalysisTab";
import { WeightsTab } from "@/components/RFPSummary/WeightsTab";
import { RequirementsTab } from "@/components/RFPSummary/RequirementsTab";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { useAnalyzeRFP } from "@/hooks/use-analyze-rfp";
import {
  Building2,
  Users,
  CheckCircle2,
  File,
  FileText,
  Activity,
  Zap,
  FileUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Sliders,
  ListChecks,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RFPSummaryData {
  rfp: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
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
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");

  const {
    mutate: triggerAnalysis,
    isPending: isAnalyzing,
    isSuccess: analysisSuccess,
  } = useAnalyzeRFP();

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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue",
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
            <Link href={`/dashboard/rfp/${rfpId}/import`}>
              <Button variant="outline" size="sm" className="gap-2">
                <FileUp className="h-4 w-4" />
                <span className="hidden sm:inline">Importer</span>
              </Button>
            </Link>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => triggerAnalysis(rfpId)}
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : analysisSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="hidden sm:inline">Analysis Started</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Analysis</span>
                </>
              )}
            </Button>
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
                value="heatmap"
                className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
              >
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">Heatmap</span>
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
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Fournisseurs
                        </h2>
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
                <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
                  <AnalystsTab rfpId={rfpId} />
                </Card>
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
                <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
                  <AnalysisTab rfpId={rfpId} />
                </Card>
              )}
            </TabsContent>

            <TabsContent value="heatmap" className="space-y-6">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <RequirementsHeatmap rfpId={rfpId} />
              )}
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
      </div>
    </div>
  );
}
