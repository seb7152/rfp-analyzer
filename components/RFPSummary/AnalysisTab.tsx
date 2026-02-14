import React, { useState, useEffect } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";

interface AnalysisTabProps {
  rfpId: string;
  peerReviewEnabled?: boolean;
}

export function AnalysisTab({ rfpId, peerReviewEnabled = false }: AnalysisTabProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

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
        peerReviewEnabled={peerReviewEnabled}
      />
    </div>
  );
}
