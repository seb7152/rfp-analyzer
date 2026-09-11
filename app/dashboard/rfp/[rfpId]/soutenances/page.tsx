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
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="Soutenances"
        lead="Briefs par fournisseur, transcripts et rapports d'analyse des soutenances."
      />
      <div className="panel mx-4 p-4 md:mx-8 md:p-5">
        <PresentationAnalysisSection
          rfpId={rfpId}
          versionId={activeVersion?.id}
          userAccessLevel={access}
        />
      </div>
    </div>
  );
}
