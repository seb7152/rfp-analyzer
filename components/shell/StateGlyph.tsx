import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChapterState } from "@/hooks/use-consultation";

/**
 * Point d'état d'un chapitre. Jamais seul : le parent l'accompagne d'un
 * libellé ou d'un chiffre ; la forme change pour l'état en cours d'analyse.
 */
export function StateGlyph({
  state,
  className,
}: {
  state: ChapterState;
  className?: string;
}) {
  if (state === "processing") {
    return (
      <Loader2
        aria-hidden
        className={cn("h-3.5 w-3.5 shrink-0 animate-spin text-primary", className)}
      />
    );
  }
  if (state === "neutral") {
    return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        state === "done" && "bg-status-pass",
        state === "partial" && "bg-status-partial",
        state === "empty" && "border-[1.5px] border-input bg-transparent",
        className
      )}
    />
  );
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
