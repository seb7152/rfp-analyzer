import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  hint?: string;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  tone?: string;
}

export function KPICard({
  label,
  value,
  icon,
  subtitle,
  hint,
  trend,
  tone = "from-slate-100 to-white dark:from-slate-900 dark:to-slate-950",
}: KPICardProps) {
  return (
    <Card
      className={`group overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b ${tone} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {subtitle}
            </p>
          )}
          {hint && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {hint}
            </p>
          )}
          {trend && (
            <div
              className={`text-xs mt-2 font-medium ${
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
            </div>
          )}
        </div>
        {icon && (
          <span className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}
