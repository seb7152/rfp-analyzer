"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { GranolaSettings } from "@/components/connectors/GranolaSettings";
import { useOrganization } from "@/hooks/use-organization";

/** Organisation settings › Agents & IA › Connecteurs: the outside services the chapters read from. */
export default function ConnecteursPage() {
  const { currentOrg, isAdmin, isLoading } = useOrganization();
  if (isLoading) return <PageState kind="loading" title="Chargement des connecteurs" />;
  if (!currentOrg) return <PageState kind="empty" title="Aucune organisation" />;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader title="Connecteurs" lead="Les services extérieurs que les chapitres lisent. Les clés sont stockées chiffrées et ne sont jamais réaffichées." />
      <div className="mx-4 md:mx-8">
        <GranolaSettings organizationId={currentOrg.id} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
