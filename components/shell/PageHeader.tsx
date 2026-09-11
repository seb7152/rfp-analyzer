import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Header of a chapter: the title, an optional lead sentence under it, and at
 * most one primary action on the right.
 */
export function PageHeader({
  title,
  lead,
  actions,
  className,
  children,
}: {
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 px-4 pb-2 pt-5 md:flex-row md:items-start md:justify-between md:px-8",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold leading-7 tracking-[-0.01em] text-foreground">{title}</h1>
        {lead && <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{lead}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
