import React, { useState, useEffect, useCallback } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>
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
      />
    </div>
  );
}
