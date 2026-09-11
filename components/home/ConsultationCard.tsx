"use client";

import Link from "next/link";
import { ListChecks, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shell/UserMenu";
import { PHASE_LABELS, type ConsultationOverview } from "@/hooks/use-consultations-overview";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; className: string }> = {
  in_progress: { label: "En cours", className: "stamp-partial" },
  completed: { label: "Terminée", className: "stamp-pass" },
  archived: { label: "Archivée", className: "stamp-pending" },
};

function PhaseDots({ phase }: { phase: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Phase : ${PHASE_LABELS[phase]}`}>
      {PHASE_LABELS.map((label, i) => {
        const done = i < phase;
        const cur = i === phase;
        return (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              title={label}
              className={cn(
                "inline-block rounded-full border-2 box-border",
                cur ? "h-2.5 w-2.5" : "h-2 w-2",
                done || cur ? "border-primary bg-primary" : "border-input bg-transparent"
              )}
            />
            {i < PHASE_LABELS.length - 1 && (
              <span className={cn("inline-block h-0.5 w-3.5", done ? "bg-primary" : "bg-input")} />
            )}
          </span>
        );
      })}
      <span className="ml-1.5 text-xs text-muted-foreground">{PHASE_LABELS[phase]}</span>
    </span>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span aria-hidden className="inline-block h-1.5 w-[110px] overflow-hidden rounded-full bg-muted align-middle">
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function ConsultationCard({
  item,
  canDelete,
  onDelete,
}: {
  item: ConsultationOverview;
  canDelete: boolean;
  onDelete?: () => void;
}) {
  const { rfp, preparation: p } = item;
  const status = STATUS[rfp.status] ?? { label: rfp.status, className: "stamp-pending" };
  const suppliers = p?.suppliers.items ?? [];
  const shown = suppliers.slice(0, 3);

  return (
    <article className="panel group grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_170px] md:gap-5 md:p-5" aria-labelledby={`rfp-${rfp.id}`}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 id={`rfp-${rfp.id}`} className="text-md font-semibold leading-5">
            <Link href={item.href} className="hover:underline underline-offset-4">{rfp.title}</Link>
          </h3>
          <span className={cn("stamp", status.className)}>{status.label}</span>
        </div>
        {item.isLoading ? (
          <div className="h-3 w-40 animate-pulse rounded-sm bg-muted" />
        ) : item.error ? (
          <p className="text-xs text-muted-foreground">État indisponible : {item.error.message}</p>
        ) : (
          <>
            <PhaseDots phase={item.phase} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <ListChecks className="h-3.5 w-3.5" />
                <span className="num text-foreground">{item.toEvaluate}</span> réponses à évaluer
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5" />
                IA <span className="num text-foreground">{item.aiScored}/{item.aiTotal}</span>
                {item.aiProcessing && <span className="text-primary">en cours</span>}
              </span>
              {item.openThreads !== null && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="num text-foreground">{item.openThreads}</span> discussions
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {shown.length === 0 ? (
          <span className="text-xs text-muted-foreground">Aucun fournisseur déclaré</span>
        ) : (
          shown.map((s) => {
            const pct = s.responsesTotal > 0 ? Math.round((s.responsesAnswered / s.responsesTotal) * 100) : 0;
            return (
              <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-[76px] truncate">{s.name}</span>
                <Bar pct={pct} />
                <span className="num w-10 whitespace-nowrap text-right text-foreground">{pct} %</span>
              </div>
            );
          })
        )}
        {suppliers.length > 3 && (
          <span className="text-2xs text-muted-foreground">+ {suppliers.length - 3} fournisseurs</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 md:flex-col md:items-end">
        <div className="flex pl-1.5">
          {item.people.slice(0, 4).map((person, i) => (
            <Avatar key={person.userId} name={person.userName} tone={i} className="-ml-1.5 border-2 border-card" />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {item.lastActivity && (
            <span className="text-right text-2xs text-muted-foreground">
              {item.lastActivity.userName} · {formatDateTime(item.lastActivity.at)}
            </span>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="xs"
              mode="icon"
              aria-label={`Supprimer ${rfp.title}`}
              className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
