"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RunStamp } from "@/components/agents/RunStamp";
import { useRetryBatch, type RunWithDetails, type AgentSummary } from "@/hooks/use-rfp-agents";
import { formatDateTime, formatTokens, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The analyses of the version, one line each, batches on demand. */
export function RunsList({ rfpId, runs, canRetry }: { rfpId: string; runs: RunWithDetails[]; canRetry: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const retry = useRetryBatch(rfpId);

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onRetry = async (runId: string, batchId: string) => {
    try {
      await retry.mutateAsync({ runId, batchId });
      toast.success("Lot remis en attente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le lot n'a pas pu être relancé.");
    }
  };

  if (runs.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground md:px-5">Aucune analyse lancée sur cette version.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5 font-medium md:px-5">Analyse</th>
          <th className="px-3 py-2.5 font-medium">État</th>
          <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">Lots</th>
          <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">Propositions</th>
          <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
          <th className="px-4 py-2.5 text-right font-medium md:px-5">Coût</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => {
          const isOpen = open.has(r.id);
          const batches = r.agent_run_batches;
          const done = batches.filter((b) => b.status === "completed").length;
          return (
            <RunRow key={r.id} run={r} isOpen={isOpen} onToggle={() => toggle(r.id)} done={done} canRetry={canRetry} onRetry={onRetry} retrying={retry.isPending} />
          );
        })}
      </tbody>
    </table>
  );
}

function RunRow({
  run,
  isOpen,
  onToggle,
  done,
  canRetry,
  onRetry,
  retrying,
}: {
  run: RunWithDetails;
  isOpen: boolean;
  onToggle: () => void;
  done: number;
  canRetry: boolean;
  onRetry: (runId: string, batchId: string) => void;
  retrying: boolean;
}) {
  const agent = run.agent_versions?.agents?.name ?? "Agent";
  const version = run.agent_versions?.version_number;
  return (
    <>
      <tr className="border-b border-border hover:bg-accent/40">
        <td className="px-4 py-2 md:px-5">
          <button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-start gap-2 text-left">
            {isOpen ? <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0">
              <span className="block truncate">
                <span className="font-medium">{agent}</span>
                {version ? <span className="num ml-1 text-xs text-muted-foreground">v{version}</span> : null}
                <span className="text-muted-foreground"> · </span>
                {run.suppliers?.name ?? "Fournisseur"}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="article-no">{run.categories?.code}</span>
                <span className="truncate">{run.categories?.title}</span>
              </span>
            </span>
          </button>
        </td>
        <td className="px-3 py-2">
          <RunStamp status={run.status} />
        </td>
        <td className="num hidden px-3 py-2 text-right text-muted-foreground md:table-cell">
          {done}/{run.agent_run_batches.length}
        </td>
        <td className="num hidden px-3 py-2 text-right md:table-cell">
          {run.findings.produced}
          {run.findings.unsourced > 0 && <span className="ml-1 text-xs text-status-partial">({run.findings.unsourced} non sourcées)</span>}
        </td>
        <td className="num px-3 py-2 text-right text-muted-foreground" title={`${run.prompt_tokens} en entrée, ${run.completion_tokens} en sortie, ${run.cached_tokens} servis du cache`}>
          {formatTokens(run.prompt_tokens + run.completion_tokens)}
          {run.cached_tokens > 0 && <span className="ml-1 text-xs">({formatTokens(run.cached_tokens)} cache)</span>}
        </td>
        <td className="num px-4 py-2 text-right md:px-5">{run.cost > 0 ? formatUsd(Number(run.cost), 3) : "—"}</td>
      </tr>
      {isOpen && (
        <tr className="border-b border-border bg-background">
          <td colSpan={6} className="px-4 py-2 md:px-5">
            {run.error && <p className="mb-2 text-xs text-status-fail">{run.error}</p>}
            <dl className="mb-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
              <div>
                <dt>Modèle servi</dt>
                <dd className="num text-foreground">{run.served_model ?? run.agent_versions?.model_id ?? "—"}</dd>
              </div>
              <div>
                <dt>Démarrée</dt>
                <dd className="text-foreground">{formatDateTime(run.started_at)}</dd>
              </div>
              <div>
                <dt>Terminée</dt>
                <dd className="text-foreground">{formatDateTime(run.completed_at)}</dd>
              </div>
              <div>
                <dt>Entrée / sortie / cache</dt>
                <dd className="num text-foreground">
                  {formatTokens(run.prompt_tokens)} / {formatTokens(run.completion_tokens)} / {formatTokens(run.cached_tokens)}
                </dd>
              </div>
            </dl>
            <ul className="divide-y divide-border rounded-md border border-border">
              {run.agent_run_batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-xs">
                  <span className="num w-12 text-muted-foreground">lot {b.batch_index + 1}</span>
                  <RunStamp status={b.status} />
                  <span className="num text-muted-foreground">{b.requirement_ids.length} exig.</span>
                  <span className="num text-muted-foreground">
                    {formatTokens(b.prompt_tokens)} / {formatTokens(b.completion_tokens)}
                    {b.cached_tokens > 0 ? ` (${formatTokens(b.cached_tokens)} cache)` : ""}
                  </span>
                  <span className="num text-muted-foreground">{Number(b.cost) > 0 ? formatUsd(Number(b.cost), 3) : ""}</span>
                  {b.attempts > 1 && <span className="text-muted-foreground">{b.attempts} tentatives</span>}
                  {b.error && <span className={cn("min-w-0 flex-1 truncate", b.status === "failed" ? "text-status-fail" : "text-muted-foreground")} title={b.error}>{b.error}</span>}
                  {canRetry && b.status === "failed" && (
                    <Button variant="outline" size="xs" className="ml-auto" disabled={retrying} onClick={() => onRetry(run.id, b.id)}>
                      <RotateCcw className="h-3 w-3" />
                      Relancer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

/** Proposals produced, unsourced, accepted, rejected, per agent. */
export function SummaryTable({ summary }: { summary: AgentSummary[] }) {
  if (summary.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground md:px-5">Aucune proposition produite sur cette version.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5 font-medium md:px-5">Agent</th>
          <th className="px-3 py-2.5 text-right font-medium">Produites</th>
          <th className="px-3 py-2.5 text-right font-medium">Non sourcées</th>
          <th className="px-3 py-2.5 text-right font-medium">À décider</th>
          <th className="px-3 py-2.5 text-right font-medium">Acceptées</th>
          <th className="px-4 py-2.5 text-right font-medium md:px-5">Rejetées</th>
        </tr>
      </thead>
      <tbody>
        {summary.map((s) => (
          <tr key={s.agent_id} className="border-b border-border last:border-b-0">
            <td className="px-4 py-2 font-medium md:px-5">{s.agent_name}</td>
            <td className="num px-3 py-2 text-right">{s.produced}</td>
            <td className={cn("num px-3 py-2 text-right", s.unsourced > 0 && "text-status-partial")}>{s.unsourced}</td>
            <td className="num px-3 py-2 text-right">{s.proposed}</td>
            <td className="num px-3 py-2 text-right">{s.accepted}</td>
            <td className="num px-4 py-2 text-right md:px-5">{s.rejected}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
