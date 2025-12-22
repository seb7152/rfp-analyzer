"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUp, FileText } from "lucide-react";
import { useVersion } from "@/contexts/VersionContext";
import { PresentationImportModal } from "./PresentationImportModal";
import { PresentationReport } from "./PresentationReport";
import { CategoryAnalysisTable } from "./CategoryAnalysisTable";

interface Supplier {
  id: string;
  name: string;
}

interface PresentationAnalysisSectionProps {
  rfpId: string;
  suppliers: Supplier[];
  versionId?: string;
}

export function PresentationAnalysisSection({
  rfpId,
  suppliers,
  versionId: versionIdProp,
}: PresentationAnalysisSectionProps) {
  const { activeVersion } = useVersion();
  const [activeTab, setActiveTab] = useState<"preparation" | "report">(
    "preparation"
  );
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use active version from context, fallback to prop
  const activeVersionId = activeVersion?.id || versionIdProp;

  const handleImportSuccess = () => {
    // Trigger refresh of report data
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Left-side pill tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab("preparation")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === "preparation"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Préparation
          </span>
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === "report"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compte rendu
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "preparation" && (
          <div className="space-y-6">
            {/* Defense Analysis Table */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Analyse des défenses par catégorie
              </h2>
              <CategoryAnalysisTable rfpId={rfpId} />
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Import Button */}
            <Card className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    Importer un nouveau transcript
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Analysez une nouvelle transcription de soutenance
                  </p>
                </div>
                <Button
                  onClick={() => setIsImportModalOpen(true)}
                  className="gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Importer
                </Button>
              </div>
            </Card>

            {/* Report and Suggestions */}
            <PresentationReport
              rfpId={rfpId}
              suppliers={suppliers}
              versionId={activeVersion?.id}
              key={refreshKey}
            />
          </div>
        )}
      </div>

      {/* Import Modal */}
      <PresentationImportModal
        rfpId={rfpId}
        suppliers={suppliers}
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleImportSuccess}
        versionId={activeVersionId}
      />
    </div>
  );
}
