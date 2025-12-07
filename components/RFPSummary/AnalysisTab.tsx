import React, { useState } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({ rfpId }: AnalysisTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  return (
    <div className="space-y-8">
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
