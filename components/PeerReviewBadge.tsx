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
  className?: string;
}

export function PeerReviewBadge({
  status,
  size = "md",
  className,
}: PeerReviewBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

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
