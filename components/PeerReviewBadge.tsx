"use client";

import type { PeerReviewStatus } from "@/types/peer-review";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  PeerReviewStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "En cours",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  submitted: {
    label: "En attente",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  },
  approved: {
    label: "Validé",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
  },
  rejected: {
    label: "Rejeté",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  },
};

interface PeerReviewBadgeProps {
  status: PeerReviewStatus;
  size?: "sm" | "md";
  className?: string;
}

export function PeerReviewBadge({
  status,
  size = "md",
  className,
}: PeerReviewBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm"
          ? "px-1.5 py-0.5 text-xs"
          : "px-2.5 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
