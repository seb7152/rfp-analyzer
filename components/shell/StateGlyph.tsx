import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChapterState } from "@/hooks/use-consultation";

/**
 * Small square glyph that carries a state. Never colour alone: the parent
 * always pairs it with a label, and the glyph shape differs per state.
 */
export function StateGlyph({
  state,
  className,
}: {
  state: ChapterState;
  className?: string;
}) {
  const base =
    "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border";
  switch (state) {
    case "done":
      return (
        <span
          aria-hidden
          className={cn(
            base,
            "border-status-pass bg-status-pass text-background",
            className
          )}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      );
    case "partial":
      return (
        <span
          aria-hidden
          className={cn(base, "border-status-partial overflow-hidden", className)}
        >
          <span className="h-full w-1/2 self-start bg-status-partial" />
        </span>
      );
    case "processing":
      return (
        <Loader2
          aria-hidden
          className={cn("h-3.5 w-3.5 shrink-0 animate-spin text-primary", className)}
        />
      );
    case "neutral":
      return (
        <span
          aria-hidden
          className={cn(base, "border-transparent", className)}
        />
      );
    default:
      return (
        <span
          aria-hidden
          className={cn(base, "border-input", className)}
        />
      );
  }
}

export function stateLabel(state: ChapterState): string {
  switch (state) {
    case "done":
      return "Terminé";
    case "partial":
      return "En cours";
    case "processing":
      return "En cours d'analyse";
    case "neutral":
      return "";
    default:
      return "À faire";
  }
}
