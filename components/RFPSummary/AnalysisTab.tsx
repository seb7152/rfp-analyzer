import React, { useState, useEffect, useCallback } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";

interface AnalysisTabProps {
  rfpId: string;
  peerReviewEnabled?: boolean;
}

export function AnalysisTab({ rfpId, peerReviewEnabled = false }: AnalysisTabProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
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
        refreshKey={refreshKey}
      />
      <RequirementsHeatmap
        rfpId={rfpId}
        selectedCategoryId={selectedCategoryId}
        peerReviewEnabled={peerReviewEnabled}
        refreshKey={refreshKey}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
