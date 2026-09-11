"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRFPCompletion } from "@/hooks/use-completion";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "in_progress" | "completed" | "archived";

const STATUS: Record<string, { label: string; className: string }> = {
  in_progress: { label: "En cours", className: "stamp-partial" },
  completed: { label: "Terminée", className: "stamp-pass" },
  archived: { label: "Archivée", className: "stamp-pending" },
};

function ProgressCell({ rfpId }: { rfpId: string }) {
  const { percentage, isLoading } = useRFPCompletion(rfpId);
  if (isLoading) {
    return <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />;
  }
  const value = Math.round(percentage ?? 0);
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="hidden h-1.5 w-16 overflow-hidden rounded-sm bg-muted md:block"
      >
        <span
          className="block h-full bg-primary"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="tnum text-xs text-muted-foreground">{value} %</span>
    </div>
  );
}

export function ConsultationsTable({
  rfps,
  isLoading,
  canDelete,
  onDelete,
}: {
  rfps: RFP[];
  isLoading: boolean;
  canDelete: boolean;
  onDelete?: (rfpId: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<RFP | null>(null);

  const counts = useMemo(() => {
    const c = { all: rfps.length, in_progress: 0, completed: 0, archived: 0 };
    for (const r of rfps) {
      if (r.status in c) c[r.status as keyof typeof c]++;
    }
    return c;
  }, [rfps]);

  const rows = useMemo(
    () =>
      (filter === "all" ? rfps : rfps.filter((r) => r.status === filter)).sort(
        (a, b) => (a.created_at < b.created_at ? 1 : -1)
      ),
    [rfps, filter]
  );

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "Toutes" },
    { id: "in_progress", label: "En cours" },
    { id: "completed", label: "Terminées" },
    { id: "archived", label: "Archivées" },
  ];

  return (
    <section aria-labelledby="consultations-title">
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-2 md:px-6">
        <h2 id="consultations-title" className="text-sm font-semibold">
          Consultations
        </h2>
        <div role="tablist" aria-label="Filtrer par statut" className="flex gap-3">
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "-mb-[9px] border-b-2 pb-2 text-sm transition-colors duration-150",
                filter === f.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="tnum ml-1 text-xs text-muted-foreground">
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-semibold md:px-6">Consultation</th>
              <th className="px-3 py-2 font-semibold">Statut</th>
              <th className="px-3 py-2 font-semibold">Évaluation</th>
              <th className="hidden px-3 py-2 font-semibold md:table-cell">Créée le</th>
              {canDelete && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 md:px-6" colSpan={5}>
                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr className="border-t border-border">
                <td className="px-4 py-10 text-muted-foreground md:px-6" colSpan={5}>
                  {rfps.length === 0
                    ? "Aucune consultation dans cette organisation."
                    : "Aucune consultation avec ce statut."}
                </td>
              </tr>
            ) : (
              rows.map((rfp) => {
                const status = STATUS[rfp.status] ?? {
                  label: rfp.status,
                  className: "stamp-pending",
                };
                return (
                  <tr
                    key={rfp.id}
                    className="group border-t border-border transition-colors duration-150 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5 md:px-6">
                      <Link
                        href={`/dashboard/rfp/${rfp.id}`}
                        className="block font-medium text-foreground hover:underline underline-offset-2"
                      >
                        {rfp.title}
                      </Link>
                      {rfp.description && (
                        <p className="mt-0.5 line-clamp-1 max-w-[60ch] text-xs text-muted-foreground">
                          {rfp.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("stamp whitespace-nowrap", status.className)}>{status.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ProgressCell rfpId={rfp.id} />
                    </td>
                    <td className="tnum hidden px-3 py-2.5 text-muted-foreground md:table-cell">
                      {formatDate(rfp.created_at)}
                    </td>
                    {canDelete && (
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          mode="icon"
                          aria-label={`Supprimer ${rfp.title}`}
                          className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => setPendingDelete(rfp)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la consultation</AlertDialogTitle>
            <AlertDialogDescription>
              « {pendingDelete?.title} » et l'ensemble de ses exigences, réponses et
              évaluations seront supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pendingDelete) await onDelete?.(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
