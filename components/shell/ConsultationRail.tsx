"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/hooks/use-consultation";
import { StateGlyph, stateLabel } from "@/components/shell/StateGlyph";

interface ConsultationRailProps {
  title: string | null;
  statusLine: string | null;
  chapters: Chapter[];
  isLoading: boolean;
  onNavigate?: () => void;
  className?: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The dossier's table of contents. Chapters are numbered; each shows its
 * state as glyph + label, and a short figure when the phase has one.
 */
export function ConsultationRail({
  title,
  statusLine,
  chapters,
  isLoading,
  onNavigate,
  className,
}: ConsultationRailProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sommaire de la consultation"
      className={cn("flex h-full flex-col bg-secondary/60", className)}
    >
      <div className="border-b border-border px-4 py-3">
        {isLoading || !title ? (
          <div className="space-y-2">
            <div className="h-4 w-4/5 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-2/5 animate-pulse rounded-sm bg-muted" />
          </div>
        ) : (
          <>
            <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {title}
            </h2>
            {statusLine && (
              <p className="mt-0.5 text-xs text-muted-foreground">{statusLine}</p>
            )}
          </>
        )}
      </div>

      <ol className="flex-1 overflow-y-auto py-2">
        {isLoading && chapters.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-2">
                <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
              </li>
            ))
          : chapters.map((chapter) => {
              const active = isActive(pathname, chapter.href);
              const entryActive = chapter.entries.some((e) =>
                isActive(pathname, e.href)
              );
              return (
                <li
                  key={chapter.id}
                  className={cn(
                    chapter.number === null && "mt-2 border-t border-border pt-2"
                  )}
                >
                  <Link
                    href={chapter.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2 border-l-2 py-1.5 pl-3 pr-3 text-sm transition-colors duration-150",
                      active
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-transparent text-foreground hover:bg-accent/60"
                    )}
                  >
                    {chapter.number !== null ? (
                      <span className="article-no w-4 text-right">
                        {chapter.number}
                      </span>
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className="flex-1 truncate font-medium">
                      {chapter.label}
                    </span>
                    {chapter.figure && (
                      <span className="text-xs text-muted-foreground">
                        {chapter.figure}
                      </span>
                    )}
                    <StateGlyph state={chapter.state} />
                    <span className="sr-only">{stateLabel(chapter.state)}</span>
                  </Link>
                  {chapter.entries.length > 0 && (active || entryActive) && (
                    <ul className="pb-1">
                      {chapter.entries.map((entry) => {
                        const ea = isActive(pathname, entry.href);
                        return (
                          <li key={entry.href}>
                            <Link
                              href={entry.href}
                              onClick={onNavigate}
                              aria-current={ea ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-2 border-l-2 py-1 pl-9 pr-3 text-sm transition-colors duration-150",
                                ea
                                  ? "border-primary text-foreground"
                                  : "border-transparent text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {entry.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
      </ol>

      <div className="border-t border-border px-3 py-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Toutes les consultations
        </Link>
      </div>
    </nav>
  );
}
