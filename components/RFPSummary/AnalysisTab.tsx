import React, { useState } from "react";
import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";
import { CategoryHeatmap } from "@/components/RFPSummary/CategoryHeatmap";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientOnly } from "@/components/ClientOnly";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({ rfpId }: AnalysisTabProps) {
  const isMobile = useIsMobile();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  return (
    <ClientOnly>
      <div className={isMobile ? "space-y-4" : "space-y-8"}>
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
    </ClientOnly>
  );
}
