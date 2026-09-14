"use client";

import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/format";

interface ScoreControlProps {
  /** Score that counts (manual ?? ai). */
  value: number | null;
  /** True when the value is the expert's own. */
  isManual: boolean;
  aiScore: number | null;
  disabled?: boolean;
  onChange: (score: number) => void;
  onReset?: () => void;
  size?: "sm" | "md";
  id?: string;
}

/**
 * The expert's one gesture: a 0–5 rail. One click sets the score, the
 * status follows. A half step is added with the ½ key. The AI's proposal is
 * marked on the rail so confirming or correcting it is the same motion.
 */
export function ScoreControl({
  value,
  isManual,
  aiScore,
  disabled,
  onChange,
  onReset,
  size = "md",
  id,
}: ScoreControlProps) {
  const steps = [0, 1, 2, 3, 4, 5];
  const current = value;
  const base = current === null ? null : Math.floor(current);
  const half = current !== null && current - Math.floor(current) >= 0.5;
  const cell = size === "sm" ? "h-7 min-w-[28px] text-xs" : "h-8 min-w-[34px] text-sm";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Note sur 5" id={id}>
      <div className="inline-flex overflow-hidden rounded-md border border-input">
        {steps.map((s) => {
          const active = base === s;
          const isAi = aiScore !== null && Math.round(aiScore) === s && !isManual;
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={`Note ${s}${active && half ? ",5" : ""} sur 5`}
              onClick={() => onChange(s)}
              className={cn(
                "tnum relative border-r border-input font-semibold transition-colors duration-150 last:border-r-0 disabled:cursor-not-allowed disabled:opacity-60",
                cell,
                active
                  ? isManual
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                  : "bg-background text-foreground hover:bg-accent/60"
              )}
            >
              {active && half ? `${s},5` : s}
              {isAi && !active && (
                <span
                  aria-hidden
                  className="absolute inset-x-1 bottom-0.5 h-0.5 rounded-sm bg-primary/60"
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled || current === null || current >= 5}
        aria-pressed={half}
        aria-label="Ajouter un demi-point"
        title="Demi-point"
        onClick={() => {
          if (current === null) return;
          onChange(half ? Math.floor(current) : Math.floor(current) + 0.5);
        }}
        className={cn(
          "tnum rounded-md border border-input px-1.5 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
          cell,
          half ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-accent/60"
        )}
      >
        ½
      </button>
      {isManual && onReset && (
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          title={aiScore !== null ? `Revenir à la note IA (${formatScore(aiScore)})` : "Effacer la note"}
        >
          {aiScore !== null ? `IA ${formatScore(aiScore)}` : "Effacer"}
        </button>
      )}
    </div>
  );
}
