"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRequirements } from "@/hooks/use-requirements";
import { useRFPCompletion } from "@/hooks/use-completion";
import { useAnalyzeRFP } from "@/hooks/use-analyze-rfp";
import { Sidebar } from "@/components/Sidebar";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2, CheckCircle2, Zap, FileUp } from "lucide-react";

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
  const { user, isLoading: authLoading } = useAuth();
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");

  const { requirements: allRequirements, isLoading: requirementsLoading } =
    useRequirements(params.rfpId);

  const { percentage: completionPercentage, isLoading: completionLoading } =
    useRFPCompletion(params.rfpId);

  const {
    mutate: triggerAnalysis,
    isPending: isAnalyzing,
    isSuccess: analysisSuccess,
  } = useAnalyzeRFP();

  // Set RFP title from ID
  useEffect(() => {
    if (params.rfpId) {
      // Use the RFP ID as title for now (or could extract from first requirement later)
      setRfpTitle(`RFP ${params.rfpId.slice(0, 8)}`);
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
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                RFP Evaluation
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Navigate and evaluate requirements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Upload Documents Button */}
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
              title="Ajouter des documents PDF"
            >
              <FileUp className="h-4 w-4" />
              Documents
            </Button>

            {/* AI Analysis Button */}
            <Button
              onClick={() => triggerAnalysis(params.rfpId)}
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : analysisSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Analysis Started
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  AI Analysis
                </>
              )}
            </Button>

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
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Tree */}
        <div className="w-80 border-r border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/40">
          <Sidebar
            rfpId={params.rfpId}
            selectedRequirementId={selectedRequirementId}
            onSelectRequirement={setSelectedRequirementId}
          />
        </div>

        {/* Details Panel */}
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
              allRequirements={allRequirements.map((req) => normalizeRequirement(req))}
              onRequirementChange={setSelectedRequirementId}
              rfpId={params.rfpId}
            />
          )}
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        rfpId={params.rfpId}
        rfpTitle={rfpTitle}
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
    </div>
  );
}
