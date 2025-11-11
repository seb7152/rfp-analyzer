"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ProgressContext = React.createContext<{ size?: string }>({});

function ProgressProvider({
  children,
  ...props
}: React.PropsWithChildren<{ size?: string }>) {
  return <ProgressContext.Provider value={props}>{children}</ProgressContext.Provider>;
}

function useProgressContext() {
  const context = React.useContext(ProgressContext);
  return context;
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  className?: string;
}

function Progress({
  className,
  value,
  max = 100,
  ...props
}: ProgressProps) {
  const valueAsPercentage = (value / max) * 100;

  return (
    <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", className)}>
      <div
        style={{ width: `${Math.min(valueAsPercentage, 100)}%` }}
        className={cn(
          "h-full flex items-center justify-center text-xs font-medium text-slate-900 dark:text-slate-50",
          valueAsPercentage === 100 ? "bg-green-600" : "bg-blue-600",
          "transition-all duration-300 ease-out"
        )}
        {...props}
      />
    </div>
  );
}

Progress.displayName = "Progress";

export { Progress, ProgressProvider };