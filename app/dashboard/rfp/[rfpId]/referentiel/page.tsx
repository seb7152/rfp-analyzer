"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { RequirementsTab } from "@/components/RFPSummary/RequirementsTab";
import { PageHeader } from "@/components/shell/PageHeader";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { Button } from "@/components/ui/button";

/**
 * Relecture et correction de l'arborescence des exigences. Hosts the existing
 * requirements editor inside the chapter shell.
 */
export default function ReferentielPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { preparation } = useConsultation(rfpId);
  const { activeVersion } = useVersion();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        number="1.1"
        title="Référentiel des exigences"
        lead="Relisez l'arborescence issue de l'import : domaines, exigences, marqueurs obligatoire / facultatif et étiquettes. Les corrections de structure se font dans la vue arbre."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/rfp/${rfpId}/tree-view`}>Vue arbre et poids</Link>
          </Button>
        }
      />
      <div className="panel mx-4 p-4 md:mx-8 md:p-5">
        <RequirementsTab
          rfpId={rfpId}
          peerReviewEnabled={preparation?.rfp.peer_review_enabled}
          versionId={activeVersion?.id}
        />
      </div>
    </div>
  );
}
