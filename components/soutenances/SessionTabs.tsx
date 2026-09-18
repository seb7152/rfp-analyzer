"use client";

import Link from "next/link";
import type { Overview } from "@/hooks/use-soutenances";
import type { SessionState } from "@/lib/soutenance/types";
import { cn } from "@/lib/utils";

const DOT: Record<SessionState, string> = {
  a_preparer: "border-[1.5px] border-input",
  preparee: "bg-status-roadmap",
  tenue: "bg-status-partial",
  exploitee: "bg-status-pass",
};

/** The séances of the retained suppliers, as tabs under the séance's header. */
export function SessionTabs({ rfpId, overview, currentId }: { rfpId: string; overview: Overview; currentId: string }) {
  const retained = overview.sessions.filter((s) => !s.supplier.removed);
  return (
    <nav aria-label="Séances" className="mx-4 flex gap-5 overflow-x-auto border-b border-border md:mx-8">
      {retained.map((s) => {
        const on = s.supplier.id === currentId;
        return (
          <Link
            key={s.supplier.id}
            href={`/dashboard/rfp/${rfpId}/soutenances/${s.supplier.id}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex h-9 shrink-0 items-center gap-2 border-b-2 px-0.5 text-sm font-medium transition-colors duration-150",
              on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", DOT[s.state])} aria-hidden />
            {s.supplier.name}
          </Link>
        );
      })}
    </nav>
  );
}
