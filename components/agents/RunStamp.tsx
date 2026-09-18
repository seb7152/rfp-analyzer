import { Loader2 } from "lucide-react";
import type { BatchStatus, RunStatus } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

const META: Record<RunStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "stamp-pending" },
  running: { label: "En cours", className: "stamp-partial" },
  completed: { label: "Terminée", className: "stamp-pass" },
  partial: { label: "Partielle", className: "stamp-partial" },
  failed: { label: "En erreur", className: "stamp-fail" },
};

/** State stamp of an analysis or a batch: grey pill, coloured dot, label. */
export function RunStamp({ status, className }: { status: RunStatus | BatchStatus; className?: string }) {
  const meta = META[status as RunStatus] ?? META.pending;
  return (
    <span className={cn("stamp", meta.className, className)}>
      {status === "running" && <Loader2 aria-hidden className="h-3 w-3 animate-spin text-primary" />}
      {meta.label}
    </span>
  );
}

export function runStatusLabel(status: RunStatus | BatchStatus): string {
  return (META[status as RunStatus] ?? META.pending).label;
}
