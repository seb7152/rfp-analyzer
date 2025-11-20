"use client";

import { RequirementsHeatmap } from "@/components/RFPSummary/RequirementsHeatmap";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({ rfpId }: AnalysisTabProps) {
  return <RequirementsHeatmap rfpId={rfpId} />;
}
