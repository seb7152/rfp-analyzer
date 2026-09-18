"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rewriteText, type AssistTarget } from "@/hooks/use-ai-assist";
import { cn } from "@/lib/utils";

/**
 * Rewrites the text of a comment or question with the organisation's
 * rewriting model: spelling, punctuation, clearer sentences, same content.
 * The result streams into the field; an undo restores the original text
 * until the field changes again.
 */
export function TextEnhancer({
  target,
  text,
  onText,
  onDone,
  className,
  disabled = false,
}: {
  target: AssistTarget;
  text: string;
  onText: (text: string) => void;
  onDone: (text: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const lastResult = useRef<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    const before = text;
    setBusy(true);
    try {
      const result = await rewriteText(target, before, onText);
      if (result.trim()) {
        setOriginal(before);
        lastResult.current = result;
        onDone(result);
      } else {
        onText(before);
        toast.error("Le modèle n'a rien renvoyé ; le texte est inchangé.");
      }
    } catch (err) {
      onText(before);
      toast.error(err instanceof Error ? err.message : "La remise en forme a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    if (original === null) return;
    onText(original);
    onDone(original);
    setOriginal(null);
    lastResult.current = null;
  };

  // The undo is offered only while the field still holds the rewritten text.
  const canUndo = original !== null && lastResult.current === text;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {canUndo && (
        <Button type="button" variant="ghost" size="xs" mode="icon" onClick={undo} aria-label="Revenir au texte d'origine" title="Revenir au texte d'origine" className="h-7 w-7 rounded-full">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        mode="icon"
        onClick={run}
        disabled={disabled || busy || !text.trim()}
        aria-label="Remettre en forme avec l'IA"
        title={busy ? "Remise en forme en cours" : "Remettre en forme avec l'IA"}
        className="h-7 w-7 rounded-full"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />}
      </Button>
    </div>
  );
}
