"use client";

import { useParams } from "next/navigation";
import { PresentationAnalysisSection } from "@/components/RFPSummary/PresentationAnalysisSection";
import { PageHeader } from "@/components/shell/PageHeader";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";

export default function SoutenancesPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { access } = useConsultation(rfpId);
  const { activeVersion } = useVersion();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        number="4.2"
        title="Soutenances"
        lead="Briefs par fournisseur, transcripts et rapports d'analyse des soutenances."
      />
      <div className="px-4 py-4 md:px-6">
        <PresentationAnalysisSection
          rfpId={rfpId}
          versionId={activeVersion?.id}
          userAccessLevel={access}
        />
      </div>
    </div>
  );
}
