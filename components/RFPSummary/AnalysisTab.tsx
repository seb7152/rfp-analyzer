import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";
import { CategoryAnalysisTable } from "@/components/RFPSummary/CategoryAnalysisTable";
import { Presentation } from "lucide-react";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({ rfpId }: AnalysisTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  return (
    <Tabs defaultValue="synthese" className="w-full">
      <TabsList className="flex w-full gap-4 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
        <TabsTrigger
          value="synthese"
          className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
        >
          Synthèse
        </TabsTrigger>
        <TabsTrigger
          value="soutenances"
          className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-0 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
        >
          <Presentation className="h-4 w-4" />
          <span className="hidden sm:inline">Soutenances</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="synthese" className="space-y-8">
        <CategoryHeatmap
          rfpId={rfpId}
          onCategorySelect={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
        />
        <RequirementsHeatmap
          rfpId={rfpId}
          selectedCategoryId={selectedCategoryId}
        />
      </TabsContent>

      <TabsContent value="soutenances" className="space-y-8">
        <CategoryAnalysisTable rfpId={rfpId} />
      </TabsContent>
    </Tabs>
  );
}
