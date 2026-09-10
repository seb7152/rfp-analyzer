"use client";

import { useParams } from "next/navigation";
import { ExportTab } from "@/components/RFPSummary/ExportTab";
import { PageHeader } from "@/components/shell/PageHeader";

export default function ExportPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        number={5}
        title="Restitution"
        lead="Le livrable est généré depuis un modèle Excel de votre organisation : chargez le modèle, définissez la correspondance des colonnes, prévisualisez, puis générez."
      />
      <div className="px-4 py-4 md:px-6">
        <ExportTab rfpId={rfpId} />
      </div>
    </div>
  );
}
