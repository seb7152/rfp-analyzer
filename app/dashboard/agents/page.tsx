"use client";

import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { useOrganization } from "@/hooks/use-organization";
import { useAgents } from "@/hooks/use-agents";
import { formatPercent } from "@/lib/format";

const REASONING_LABEL: Record<string, string> = { none: "aucun", medium: "moyen", high: "élevé" };

/**
 * Organisation settings › Agents: the list, with where each agent is used
 * and how often its proposals are accepted.
 */
export default function AgentsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const query = useAgents(currentOrg?.id ?? null);

  if (orgLoading || (currentOrg && query.isLoading)) return <PageState kind="loading" title="Chargement des agents" />;
  if (!currentOrg) return <PageState kind="empty" title="Aucune organisation" />;
  if (query.error) {
    return (
      <PageState
        kind="error"
        title="Les agents n'ont pas pu être chargés"
        description={query.error.message}
        action={<Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>}
      />
    );
  }

  const agents = query.data?.agents ?? [];
  const isAdmin = query.data?.role === "admin";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="Agents"
        lead="Des relecteurs spécialisés, définis une fois pour l'organisation, affectés aux domaines de chaque consultation. Leurs propositions sont acceptées ou rejetées par les évaluateurs."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/dashboard/agents/new">
                <Plus className="h-4 w-4" />
                Nouvel agent
              </Link>
            </Button>
          ) : undefined
        }
      />

      <section className="panel mx-4 overflow-hidden md:mx-8">
        {agents.length === 0 ? (
          <PageState
            kind="empty"
            title="Aucun agent"
            description={isAdmin ? "Créez un premier agent : un nom, un modèle, un prompt." : "Un administrateur de l'organisation peut en créer."}
            className="min-h-0 py-10"
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5 font-medium md:px-5">Agent</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">Modèle</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">Raisonnement</th>
                <th className="px-3 py-2.5 text-right font-medium">Version</th>
                <th className="px-3 py-2.5 text-right font-medium">Consultations</th>
                <th className="px-4 py-2.5 text-right font-medium md:px-5">Acceptation</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-b-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5 md:px-5">
                    <Link href={`/dashboard/agents/${a.id}`} className="flex items-start gap-2.5">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">
                          {a.name}
                          {a.archived_at && <span className="stamp stamp-pending">Archivé</span>}
                        </span>
                        {a.description && <span className="block truncate text-xs text-muted-foreground">{a.description}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="num hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">{a.model_id}</td>
                  <td className="hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">{REASONING_LABEL[a.reasoning_effort] ?? a.reasoning_effort}</td>
                  <td className="num px-3 py-2.5 text-right">v{a.current_version}</td>
                  <td className="num px-3 py-2.5 text-right">{a.consultations}</td>
                  <td className="num px-4 py-2.5 text-right md:px-5">
                    {a.findings_decided > 0 ? (
                      <>
                        {formatPercent((a.findings_accepted / a.findings_decided) * 100)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({a.findings_accepted}/{a.findings_decided})
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
