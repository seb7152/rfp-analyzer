"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUp, FileText } from "lucide-react";
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
  versionId,
}: PresentationAnalysisSectionProps) {
  const [activeTab, setActiveTab] = useState<"preparation" | "report">(
    "preparation"
  );
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
          <Card className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Importer les transcripts de soutenance
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Collez le transcript brut de chaque soutenance. N8N analysera
                  le contenu et proposera des mises à jour pour les commentaires
                  et réponses en fonction des exigences du RFP.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => setIsImportModalOpen(true)}
                  className="gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Importer un transcript
                </Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "report" && (
          <div className="space-y-6">
            <PresentationReport
              rfpId={rfpId}
              suppliers={suppliers}
              key={refreshKey}
            />
          </div>
        )}
      </div>

      {/* Defense Analysis Section */}
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

      {/* Import Modal */}
      <PresentationImportModal
        rfpId={rfpId}
        suppliers={suppliers}
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleImportSuccess}
        versionId={versionId}
      />
    </div>
  );
}
