"use client";

import { AlertTriangle, AlertOctagon, Circle } from "lucide-react";
import type { ThreadPriority } from "@/types/response-thread";

interface ThreadPriorityBadgeProps {
  priority: ThreadPriority;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const PRIORITY_CONFIG: Record<
  ThreadPriority,
  { label: string; color: string; bgColor: string; Icon: typeof Circle }
> = {
  blocking: {
    label: "Bloquant",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    Icon: AlertOctagon,
  },
  important: {
    label: "Important",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    Icon: AlertTriangle,
  },
  normal: {
    label: "Normal",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700",
    Icon: Circle,
  },
};

export function ThreadPriorityBadge({
  priority,
  size = "sm",
  showLabel = true,
}: ThreadPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${config.bgColor} ${config.color} ${size === "sm" ? "text-[10px]" : "text-xs"} font-medium`}
    >
      <config.Icon size={iconSize} />
      {showLabel && config.label}
    </span>
  );
}
