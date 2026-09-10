import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Header of a chapter: number + title on one line, an optional lead sentence
 * under it, and at most one primary action on the right.
 */
export function PageHeader({
  number,
  title,
  lead,
  actions,
  className,
  children,
}: {
  number?: number | string | null;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-start md:justify-between md:px-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="flex items-baseline gap-2 text-xl font-semibold leading-6 text-foreground">
          {number !== undefined && number !== null && (
            <span className="article-no text-sm">{number}</span>
          )}
          <span className="truncate">{title}</span>
        </h1>
        {lead && <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{lead}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
