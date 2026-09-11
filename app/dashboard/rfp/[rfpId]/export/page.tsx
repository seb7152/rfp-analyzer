"use client";

import { useParams } from "next/navigation";
import { ExportTab } from "@/components/RFPSummary/ExportTab";
import { PageHeader } from "@/components/shell/PageHeader";

export default function ExportPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        number={5}
        title="Restitution"
        lead="Le livrable est généré depuis un modèle Excel de votre organisation : chargez le modèle, définissez la correspondance des colonnes, prévisualisez, puis générez."
      />
      <div className="panel mx-4 p-4 md:mx-8 md:p-5">
        <ExportTab rfpId={rfpId} />
      </div>
    </div>
  );
}
