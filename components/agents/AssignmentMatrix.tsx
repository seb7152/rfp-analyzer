"use client";

import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAssignAgent, useUnassignAgent, type AssignmentsData } from "@/hooks/use-rfp-agents";
import type { Agent } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

/**
 * Domains × agents. One click assigns an agent to a domain of level 1 or 2
 * (its whole subtree); a leaf can be covered by one agent only, so a cell
 * is refused when a parent or child domain is already assigned.
 */
export function AssignmentMatrix({
  rfpId,
  data,
  agents,
  canEdit,
}: {
  rfpId: string;
  data: AssignmentsData;
  agents: Agent[];
  canEdit: boolean;
}) {
  const assign = useAssignAgent(rfpId);
  const unassign = useUnassignAgent(rfpId);
  const busy = assign.isPending || unassign.isPending;

  const byCategory = new Map(data.assignments.map((a) => [a.category_id, a]));
  const activeAgents = agents.filter((a) => !a.archived_at);
  // Archived agents that still hold an assignment stay visible so they can be removed.
  const assignedArchived = agents.filter((a) => a.archived_at && data.assignments.some((x) => x.agent_id === a.id));
  const columns = [...activeAgents, ...assignedArchived];

  const ordered = data.domains
    .filter((d) => d.level === 1)
    .flatMap((d) => [d, ...data.domains.filter((c) => c.parent_id === d.id)]);

  const coveredBy = (categoryId: string, parentId: string | null) => {
    const own = byCategory.get(categoryId);
    if (own) return { assignment: own, inherited: false };
    const parent = parentId ? byCategory.get(parentId) : undefined;
    if (parent) return { assignment: parent, inherited: true };
    return null;
  };

  const toggle = async (categoryId: string, agentId: string) => {
    const current = byCategory.get(categoryId);
    try {
      if (current && current.agent_id === agentId) {
        await unassign.mutateAsync({ assignmentId: current.id });
      } else {
        if (current) await unassign.mutateAsync({ assignmentId: current.id });
        await assign.mutateAsync({ agent_id: agentId, category_id: categoryId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'affectation a été refusée.");
    }
  };

  if (columns.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground md:px-5">Aucun agent actif dans l&apos;organisation.</p>;
  }
  if (ordered.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground md:px-5">Le référentiel n&apos;a pas encore de domaine.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2.5 font-medium md:px-5">Domaine</th>
            <th className="px-3 py-2.5 text-right font-medium">Exigences</th>
            {columns.map((a) => (
              <th key={a.id} className="px-3 py-2.5 text-center font-medium">
                <span className="inline-flex items-center gap-1">
                  {a.name}
                  {a.archived_at && <span className="text-2xs">(archivé)</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((d) => {
            const cover = coveredBy(d.id, d.parent_id);
            const childAssigned = d.level === 1 && data.domains.some((c) => c.parent_id === d.id && byCategory.has(c.id));
            return (
              <tr key={d.id} className="border-b border-border last:border-b-0">
                <td className={cn("px-4 py-2 md:px-5", d.level === 2 && "pl-9 md:pl-10")}>
                  <span className="flex items-center gap-2">
                    <span className="article-no">{d.code}</span>
                    <span className={cn("truncate", d.level === 1 && "font-medium")}>{d.title}</span>
                  </span>
                </td>
                <td className="num px-3 py-2 text-right text-muted-foreground">{d.leaves}</td>
                {columns.map((a) => {
                  const mine = cover?.assignment.agent_id === a.id;
                  const blocked = (cover?.inherited ?? false) || childAssigned || !!a.archived_at;
                  const label = mine
                    ? cover?.inherited
                      ? `${a.name} couvre ${d.code} par son domaine parent`
                      : `Retirer ${a.name} de ${d.code}`
                    : blocked
                      ? `${d.code} est déjà couvert par un domaine parent ou enfant`
                      : `Affecter ${a.name} à ${d.code}`;
                  return (
                    <td key={a.id} className="px-3 py-1.5 text-center">
                      <button
                        type="button"
                        disabled={!canEdit || busy || (blocked && !mine) || (mine && cover?.inherited)}
                        aria-pressed={mine}
                        aria-label={label}
                        title={label}
                        onClick={() => toggle(d.id, a.id)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                          mine
                            ? cover?.inherited
                              ? "border-transparent bg-accent/60 text-primary/60"
                              : "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-accent disabled:opacity-40 disabled:hover:bg-background"
                        )}
                      >
                        {busy && !mine ? <span className="sr-only">Enregistrement</span> : null}
                        {mine ? <Check className="h-4 w-4" /> : busy ? <Loader2 className="h-3 w-3 animate-spin opacity-0" /> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
