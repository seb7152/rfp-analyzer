import React, { useState } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";
import { CategoryAnalysisTable } from "@/components/RFPSummary/CategoryAnalysisTable";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({ rfpId }: AnalysisTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  return (
    <div className="space-y-8">
      <CategoryAnalysisTable rfpId={rfpId} />
      <CategoryHeatmap
        rfpId={rfpId}
        onCategorySelect={setSelectedCategoryId}
        selectedCategoryId={selectedCategoryId}
      />
      <RequirementsHeatmap
        rfpId={rfpId}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  );
}
