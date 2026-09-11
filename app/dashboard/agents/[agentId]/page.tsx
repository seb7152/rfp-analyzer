"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/shell/PageState";
import { AgentForm } from "@/components/agents/AgentForm";
import { useOrganization } from "@/hooks/use-organization";
import { useAgent, useAgents } from "@/hooks/use-agents";

/** One agent's sheet; `new` opens an empty one. */
export default function AgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const isNew = agentId === "new";
  const { currentOrg, isAdmin, isLoading: orgLoading } = useOrganization();
  const list = useAgents(currentOrg?.id ?? null);
  const query = useAgent(isNew ? null : agentId);

  if (orgLoading || (!isNew && query.isLoading) || list.isLoading) return <PageState kind="loading" title="Chargement de l'agent" />;
  if (!currentOrg) return <PageState kind="empty" title="Aucune organisation" />;
  if (!isNew && (query.error || !query.data)) {
    return (
      <PageState
        kind="error"
        title="L'agent n'a pas pu être chargé"
        description={query.error?.message}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/agents">Retour aux agents</Link>
          </Button>
        }
      />
    );
  }
  if (isNew && !isAdmin) {
    return <PageState kind="empty" title="Réservé aux administrateurs" description="Seul un administrateur de l'organisation crée un agent." />;
  }

  const agent = isNew ? null : query.data!.agent;
  const organizationId = agent?.organization_id ?? currentOrg.id;
  const canEdit = isNew ? isAdmin : query.data?.role === "admin";

  return (
    <AgentForm
      key={agent?.id ?? "new"}
      organizationId={organizationId}
      agent={agent}
      versions={query.data?.versions ?? []}
      canEdit={!!canEdit}
      defaultModelId={list.data?.defaultModelId ?? ""}
    />
  );
}
