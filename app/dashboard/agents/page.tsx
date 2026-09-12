"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { useOrganization } from "@/hooks/use-organization";
import { useAgents } from "@/hooks/use-agents";
import { AGENT_KIND_LABEL } from "@/lib/agents/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const REASONING_LABEL: Record<string, string> = { none: "Aucun", medium: "Moyen", high: "Élevé" };

/**
 * Organisation settings › Agents: one line per agent, where it is used and
 * how often its proposals are accepted.
 */
export default function AgentsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const query = useAgents(currentOrg?.id ?? null);
  const [tab, setTab] = useState<"active" | "archived">("active");

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

  const all = query.data?.agents ?? [];
  const active = all.filter((a) => !a.archived_at);
  const archived = all.filter((a) => a.archived_at);
  const agents = tab === "active" ? active : archived;
  const isAdmin = query.data?.role === "admin";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="Agents"
        lead="Des relecteurs spécialisés, définis une fois pour l'organisation et affectés aux domaines de chaque consultation. Leurs propositions sont acceptées ou rejetées par les évaluateurs."
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

      <div className="mx-4 flex flex-wrap items-center gap-3 md:mx-8">
        <div role="tablist" aria-label="Filtre" className="inline-flex rounded-md border border-input bg-background p-0.5 text-xs font-medium">
          {(
            [
              ["active", "Actifs", active.length],
              ["archived", "Archivés", archived.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-sm px-2.5 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label} <span className="num text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Acceptation : part des propositions acceptées parmi celles décidées.</span>
      </div>

      <section className="panel mx-4 overflow-hidden md:mx-8">
        {agents.length === 0 ? (
          <PageState
            kind="empty"
            title={tab === "active" ? "Aucun agent actif" : "Aucun agent archivé"}
            description={
              tab === "active"
                ? isAdmin
                  ? "Créez un premier agent : un nom, un modèle, un prompt."
                  : "Un administrateur de l'organisation peut en créer."
                : undefined
            }
            className="min-h-0 py-10"
          />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.6fr)_220px_110px_120px_180px_36px] gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
              <span>Agent</span>
              <span>Modèle</span>
              <span>Raisonnement</span>
              <span className="text-right">Consultations</span>
              <span>Acceptation</span>
              <span />
            </div>
            <ul>
              {agents.map((a) => {
                const rate = a.findings_decided > 0 ? (a.findings_accepted / a.findings_decided) * 100 : null;
                return (
                  <li key={a.id} className="border-t border-border">
                    <Link
                      href={`/dashboard/agents/${a.id}`}
                      className="grid items-center gap-2 px-4 py-3.5 transition-colors duration-150 hover:bg-accent/40 lg:grid-cols-[minmax(0,1.6fr)_220px_110px_120px_180px_36px] lg:gap-4 md:px-5"
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                          <Bot className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[15px] font-semibold leading-5">{a.name}</span>
                            <span className="num text-xs text-muted-foreground">v{a.current_version}</span>
                            {a.kind !== "analysis" && <span className="stamp stamp-roadmap">{AGENT_KIND_LABEL[a.kind]}</span>}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">{a.description || "Sans description"}</span>
                        </span>
                      </span>
                      <span className="num inline-flex h-6 max-w-full items-center truncate rounded-md border border-border bg-rail px-2 text-xs text-muted-foreground">{a.model_id}</span>
                      <span className="text-sm text-muted-foreground">{REASONING_LABEL[a.reasoning_effort] ?? a.reasoning_effort}</span>
                      <span className="num text-sm lg:text-right">{a.consultations}</span>
                      <span className="flex flex-col gap-1">
                        {rate === null ? (
                          <span className="text-xs text-muted-foreground">Aucune proposition décidée</span>
                        ) : (
                          <span className="num flex justify-between text-xs">
                            <span className="font-semibold">{formatPercent(rate)}</span>
                            <span className="text-muted-foreground">
                              {a.findings_accepted} / {a.findings_decided}
                            </span>
                          </span>
                        )}
                        <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${rate ?? 0}%` }} />
                        </span>
                      </span>
                      <ChevronRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
