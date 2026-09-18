"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { TokensPanel } from "@/components/mcp/TokensPanel";
import { useOrganization } from "@/hooks/use-organization";
import { useRFPs } from "@/hooks/use-rfps";
import type { RFP } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RFP["status"], string> = { in_progress: "En cours", completed: "Terminée", archived: "Archivée" };

/**
 * Organisation settings › Agents & IA › MCP: the user's access tokens and,
 * for admins, which consultations the MCP tools may read and write.
 */
export default function McpPage() {
  const { currentOrg, isAdmin, isLoading } = useOrganization();
  const { rfps, isLoading: rfpsLoading, error } = useRFPs();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Set<string>>(new Set());

  if (isLoading) return <PageState kind="loading" title="Chargement" />;
  if (!currentOrg) return <PageState kind="empty" title="Aucune organisation" />;

  const toggle = async (rfp: RFP, enabled: boolean) => {
    setPending((s) => new Set(s).add(rfp.id));
    // Optimistic: the list is shared with the dashboard.
    queryClient.setQueryData<RFP[]>(["rfps", currentOrg.id], (old) => old?.map((r) => (r.id === rfp.id ? { ...r, mcp_enabled: enabled } : r)));
    try {
      const res = await fetch(`/api/rfps/${rfp.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcp_enabled: enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Le réglage n'a pas été enregistré.");
      }
      toast.success(enabled ? `« ${rfp.title} » est exposée au MCP.` : `« ${rfp.title} » n'est plus exposée au MCP.`);
    } catch (err) {
      queryClient.setQueryData<RFP[]>(["rfps", currentOrg.id], (old) => old?.map((r) => (r.id === rfp.id ? { ...r, mcp_enabled: !enabled } : r)));
      toast.error(err instanceof Error ? err.message : "Le réglage n'a pas été enregistré.");
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(rfp.id);
        return next;
      });
    }
  };

  const exposed = rfps.filter((r) => r.mcp_enabled !== false).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="MCP"
        lead="Le serveur MCP donne aux assistants et aux scripts un accès aux consultations avec vos droits, par jeton d'accès. Chaque consultation peut en être retirée."
      />

      <section className="panel mx-4 overflow-hidden md:mx-8">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-border px-4 py-3 md:px-5">
          <h2 className="text-base font-semibold">Consultations exposées</h2>
          <span className="num text-xs text-muted-foreground">
            {exposed} / {rfps.length}
          </span>
          <span className="flex-1" />
          {!isAdmin && <span className="text-xs text-muted-foreground">Un administrateur de l&apos;organisation peut modifier l&apos;exposition.</span>}
        </div>
        {rfpsLoading ? (
          <PageState kind="loading" title="Chargement des consultations" className="min-h-0 py-8" />
        ) : error ? (
          <PageState kind="error" title="Les consultations n'ont pas pu être chargées" className="min-h-0 py-8" />
        ) : rfps.length === 0 ? (
          <PageState kind="empty" title="Aucune consultation" className="min-h-0 py-8" />
        ) : (
          <ul>
            {rfps.map((rfp) => {
              const on = rfp.mcp_enabled !== false;
              return (
                <li key={rfp.id} className="flex items-center gap-3 border-t border-border px-4 py-2.5 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", !on && "text-muted-foreground")}>{rfp.title}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABEL[rfp.status] ?? rfp.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{on ? "Exposée" : "Retirée"}</span>
                  <Switch
                    checked={on}
                    disabled={!isAdmin || pending.has(rfp.id)}
                    onCheckedChange={(v) => toggle(rfp, v)}
                    aria-label={`Exposer « ${rfp.title} » au MCP`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mx-4 md:mx-8">
        <TokensPanel organizationId={currentOrg.id} />
      </section>
    </div>
  );
}
