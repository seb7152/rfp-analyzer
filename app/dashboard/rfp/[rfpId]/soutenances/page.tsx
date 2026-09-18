"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { SynthesePanel } from "@/components/soutenances/SynthesePanel";
import { SessionsPanel } from "@/components/soutenances/SessionsPanel";
import { SynthesePresenter } from "@/components/soutenances/SynthesePresenter";
import { useSoutenances } from "@/hooks/use-soutenances";

/**
 * The Soutenances chapter: the point de synthèse with the client, then one
 * séance per retained supplier. What is said there comes back into the
 * evaluation as proposals to take up.
 */
export default function SoutenancesPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const query = useSoutenances(rfpId);
  const [presenting, setPresenting] = useState(false);

  if (query.isLoading) return <PageState kind="loading" title="Chargement des soutenances" />;
  if (query.error || !query.data) {
    return (
      <PageState
        kind="error"
        title="Les soutenances n'ont pas pu être chargées"
        description={query.error?.message}
        action={<Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>}
      />
    );
  }
  const overview = query.data;
  const canEdit = overview.access === "owner" || overview.access === "admin";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader title="Soutenances" lead="Le point de synthèse avec le client, puis une séance par fournisseur retenu. Ce qui s'y dit revient dans l'évaluation sous forme de propositions à reprendre." />
      <SynthesePanel rfpId={rfpId} overview={overview} canEdit={canEdit} onPresent={() => setPresenting(true)} />
      <SessionsPanel rfpId={rfpId} overview={overview} canEdit={canEdit} />
      {presenting && <SynthesePresenter overview={overview} onClose={() => setPresenting(false)} />}
    </div>
  );
}
