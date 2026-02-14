"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { PeerReviewStatus } from "@/types/peer-review";
import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  icon: React.ElementType;
  className: string;
};

const STATUS_CONFIG: Record<PeerReviewStatus, StatusConfig> = {
  draft: {
    label: "En cours",
    icon: Clock,
    className: "bg-amber-500 text-white",
  },
  submitted: {
    label: "À valider",
    icon: Clock,
    className: "bg-blue-500 text-white",
  },
  approved: {
    label: "Validé",
    icon: CheckCircle2,
    className: "bg-green-500 text-white",
  },
  rejected: {
    label: "Rejeté",
    icon: AlertTriangle,
    className: "bg-red-500 text-white",
  },
};

interface PeerReviewBadgeProps {
  status: PeerReviewStatus;
  size?: "sm" | "md";
  iconOnly?: boolean;
  className?: string;
}

export function PeerReviewBadge({
  status,
  size = "md",
  iconOnly = false,
  className,
}: PeerReviewBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (iconOnly) {
    return (
      <span
        title={config.label}
        className={cn(
          "inline-flex items-center justify-center rounded-full flex-shrink-0",
          size === "sm" ? "w-4 h-4" : "w-5 h-5",
          config.className,
          className
        )}
      >
        <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm"
          ? "px-2 py-0.5 text-xs"
          : "px-3 py-1.5 text-sm",
        config.className,
        className
      )}
    >
      <Icon
        className={cn("mr-1.5", size === "sm" ? "w-3 h-3" : "w-4 h-4")}
      />
      {config.label}
    </span>
  );
}
