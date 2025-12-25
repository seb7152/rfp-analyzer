"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRequirements } from "@/hooks/use-requirements";
import { useRFPCompletion } from "@/hooks/use-completion";
import { useAllResponses } from "@/hooks/use-all-responses";
import { Sidebar } from "@/components/Sidebar";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2, CheckCircle2, FileUp } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVersion } from "@/contexts/VersionContext";
import { ClientOnly } from "@/components/ClientOnly";
import type { RFP } from "@/lib/supabase/types";

interface EvaluatePageProps {
  params: {
    rfpId: string;
  };
}

function normalizeRequirement(req: any): any {
  return {
    ...req,
    description: req.description || "",
    context: req.context || "",
    children: req.children?.map((child: any) => normalizeRequirement(child)),
  };
}

export default function EvaluatePage({ params }: EvaluatePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplierId");
  const requirementId = searchParams.get("requirementId");
  const { user, isLoading: authLoading } = useAuth();
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(requirementId || null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");
  const [rfpData, setRfpData] = useState<RFP | null>(null);
  const [responsesCount, setResponsesCount] = useState(0);
  const [userAccessLevel, setUserAccessLevel] = useState<
    "owner" | "evaluator" | "viewer" | "admin"
  >("viewer");
  const isMobile = useIsMobile();

  const { requirements: allRequirements, isLoading: requirementsLoading } =
    useRequirements(params.rfpId);

  const { percentage: completionPercentage, isLoading: completionLoading } =
    useRFPCompletion(params.rfpId);

  // Get active version for filtering responses
  const { activeVersion } = useVersion();

  // Load all responses for filter evaluation (filtered by active version)
  const responsesQuery = useAllResponses(params.rfpId, activeVersion?.id);
  const allResponses = (responsesQuery.data as any)?.responses || [];

  // Determine if this is a single supplier view: when supplierId is present in query params
  const isSingleSupplierView = !!supplierId;

  // Filter responses to the current supplier if in single supplier view
  const filteredResponses = useMemo(() => {
    if (!isSingleSupplierView) return allResponses;
    return allResponses.filter((r: any) => r.supplier_id === supplierId);
  }, [allResponses, supplierId, isSingleSupplierView]);

  // Fetch RFP data and responses count
  useEffect(() => {
    const fetchRFPData = async () => {
      try {
        const response = await fetch(`/api/rfps/${params.rfpId}/dashboard`);
        if (response.ok) {
          const data = await response.json();
          setRfpData(data.rfp);
          setRfpTitle(data.rfp?.title || `RFP ${params.rfpId.slice(0, 8)}`);
          setUserAccessLevel(data.userAccessLevel || "viewer");
          // Count total responses
          const total =
            (data.globalProgress?.statusDistribution?.pass || 0) +
            (data.globalProgress?.statusDistribution?.partial || 0) +
            (data.globalProgress?.statusDistribution?.fail || 0) +
            (data.globalProgress?.statusDistribution?.pending || 0);
          setResponsesCount(total);
        }
      } catch (error) {
        console.error("Failed to fetch RFP data:", error);
        setRfpTitle(`RFP ${params.rfpId.slice(0, 8)}`);
      }
    };

    if (params.rfpId) {
      fetchRFPData();
    }
  }, [params.rfpId]);

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <ClientOnly>
      <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/80 px-4 sm:px-6 py-3 sm:py-4 dark:border-slate-800 dark:bg-slate-900/60">
        {isMobile ? (
          // Mobile header - simplified
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              {/* Offline Indicator - compact for mobile */}
              <OfflineIndicator compact />

              {/* Upload Documents Button - icon only */}
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title="Ajouter des documents PDF"
              >
                <FileUp className="h-4 w-4" />
              </Button>

              {/* AI Analysis Button - icon only */}
              {rfpData && (
                <AIAnalysisButton
                  rfp={rfpData}
                  responsesCount={responsesCount}
                  hasUnanalyzedResponses={completionPercentage < 100}
                  userAccessLevel={userAccessLevel}
                  onAnalysisStarted={() => {
                    // Optional: refresh data or show toast
                  }}
                />
              )}

              {/* Completion Percentage - compact */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {completionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-600 dark:text-slate-400" />
                ) : completionPercentage === 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {completionPercentage}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Desktop header - full
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  RFP Evaluation
                </h1>
                <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400">
                  Navigate and evaluate requirements
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Offline Indicator - desktop version */}
              <OfflineIndicator />

              {/* Upload Documents Button */}
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

              {/* AI Analysis Button */}
              {rfpData && (
                <AIAnalysisButton
                  rfp={rfpData}
                  responsesCount={responsesCount}
                  hasUnanalyzedResponses={completionPercentage < 100}
                  userAccessLevel={userAccessLevel}
                  onAnalysisStarted={() => {
                    // Optional: refresh data or show toast
                  }}
                />
              )}

              {/* Completion Percentage */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                {completionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-600 dark:text-slate-400" />
                ) : completionPercentage === 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-500" />
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {completionPercentage}% Complete
                  </p>
                  {completionPercentage === 100 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      All responses evaluated
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Tree */}
        <div
          className={`${
            isMobile ? "w-full" : "w-80"
          } border-r border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/40`}
        >
          <Sidebar
            rfpId={params.rfpId}
            selectedRequirementId={selectedRequirementId}
            onSelectRequirement={setSelectedRequirementId}
            responses={filteredResponses}
            isSingleSupplier={isSingleSupplierView}
          />
        </div>

        {/* Details Panel - Desktop only */}
        {!isMobile && (
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            {!selectedRequirementId ? (
              <div className="flex h-full items-center justify-center">
                <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="p-12 text-center">
                    <p className="text-lg text-slate-700 dark:text-slate-300">
                      Select a requirement from the left sidebar to view details
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Use search to find requirements by ID or title
                    </p>
                  </div>
                </Card>
              </div>
            ) : requirementsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
              </div>
            ) : (
              <ComparisonView
                selectedRequirementId={selectedRequirementId}
                allRequirements={allRequirements.map((req) =>
                  normalizeRequirement(req)
                )}
                onRequirementChange={setSelectedRequirementId}
                rfpId={params.rfpId}
                supplierId={supplierId || undefined}
                isMobile={false}
                userAccessLevel={userAccessLevel}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile Details Sheet */}
      {isMobile && (
        <Sheet
          open={!!selectedRequirementId}
          onOpenChange={(open) => !open && setSelectedRequirementId(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-full p-0 border-l-0"
          >
            {requirementsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
              </div>
            ) : selectedRequirementId ? (
              <ComparisonView
                selectedRequirementId={selectedRequirementId}
                allRequirements={allRequirements.map((req) =>
                  normalizeRequirement(req)
                )}
                onRequirementChange={setSelectedRequirementId}
                rfpId={params.rfpId}
                supplierId={supplierId || undefined}
                isMobile={true}
                userAccessLevel={userAccessLevel}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        rfpId={params.rfpId}
        rfpTitle={rfpTitle}
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
      </div>
    </ClientOnly>
  );
}
