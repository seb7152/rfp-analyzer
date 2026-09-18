"use client";

import { useRef } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { TextEnhancer } from "@/components/TextEnhancer";
import type { AssistTarget } from "@/hooks/use-ai-assist";

function join(base: string, text: string): string {
  const b = base.trim();
  return b ? `${b}\n\n${text}` : text;
}

/**
 * The two helpers of a comment or question field: dictation, which appends
 * to what the field already holds, and rewriting of the current text.
 * `onChange` follows the stream; `onCommit` saves once the text is final.
 */
export function FieldAssist({
  target,
  value,
  onChange,
  onCommit,
  disabled,
  className,
}: {
  target: AssistTarget;
  value: string;
  onChange: (text: string) => void;
  onCommit: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const base = useRef("");
  return (
    <div className={className}>
      <AudioRecorder
        target={target}
        disabled={disabled}
        onStart={() => {
          base.current = value;
        }}
        onText={(t) => onChange(join(base.current, t))}
        onDone={(t) => {
          const v = join(base.current, t);
          onChange(v);
          onCommit(v);
        }}
      />
      {value.trim() && <TextEnhancer target={target} text={value} disabled={disabled} onText={onChange} onDone={onCommit} />}
    </div>
  );
}
