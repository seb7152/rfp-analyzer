"use client";

import { STATUS_META, type ResponseStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Pastille d'état : point coloré + libellé. */
export function StatusStamp({
  status,
  short,
  className,
}: {
  status: ResponseStatus;
  short?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("stamp", meta.className, className)} title={meta.label}>
      <span className={cn(short && "sr-only")}>{meta.label}</span>
      {short && <span aria-hidden>{meta.short}</span>}
    </span>
  );
}
