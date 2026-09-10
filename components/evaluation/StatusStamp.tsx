"use client";

import { Check, X, CircleDot, ArrowRight, Minus } from "lucide-react";
import { STATUS_META, type ResponseStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const ICONS: Record<ResponseStatus, React.ComponentType<{ className?: string }>> = {
  pass: Check,
  partial: CircleDot,
  fail: X,
  roadmap: ArrowRight,
  pending: Minus,
};

/** Square stamp: glyph + label, the status of a response. */
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
  const Icon = ICONS[status];
  return (
    <span className={cn("stamp", meta.className, className)} title={meta.label}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className={cn(short && "sr-only")}>{meta.label}</span>
      {short && <span aria-hidden>{meta.short}</span>}
    </span>
  );
}
