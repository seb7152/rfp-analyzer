"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { transcribeRecording, type AssistTarget } from "@/hooks/use-ai-assist";
import { preferredMimeType, recordingToWav } from "@/lib/audio/wav";
import { cn } from "@/lib/utils";

/** Beyond this the WAV would exceed what the route accepts. */
const MAX_SECONDS = 120;

/**
 * Dictation of a comment or question. One click records, the next stops;
 * the recording is converted to WAV in the browser and sent to the
 * organisation's transcription model, whose text streams into the field as
 * it is produced (`onText`), then `onDone` fires with the whole text.
 */
export function AudioRecorder({
  target,
  onStart,
  onText,
  onDone,
  className,
  disabled = false,
}: {
  target: AssistTarget;
  /** Fired when recording starts: the caller notes what the field already holds. */
  onStart?: () => void;
  onText: (text: string) => void;
  onDone: (text: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "recording" | "converting" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        r.onstop = null;
        r.stop();
        r.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const start = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Ce navigateur ne permet pas l'enregistrement audio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone inaccessible. Vérifiez l'autorisation du navigateur.");
      return;
    }
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void send(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
    };
    onStart?.();
    recorder.start();
    setSeconds(0);
    setPhase("recording");
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      setPhase("converting");
      r.stop();
    }
  };

  const send = async (recording: Blob) => {
    try {
      const wav = await recordingToWav(recording);
      setPhase("transcribing");
      const text = await transcribeRecording(target, wav, onText);
      onDone(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La transcription a échoué.");
    } finally {
      setPhase("idle");
      recorderRef.current = null;
    }
  };

  const recording = phase === "recording";
  const busy = phase === "converting" || phase === "transcribing";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {recording && (
        <span className="num text-xs text-status-fail" aria-live="polite">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        mode="icon"
        onClick={recording ? stop : start}
        disabled={disabled || busy}
        aria-label={recording ? "Arrêter la dictée" : "Dicter"}
        title={
          recording
            ? "Arrêter la dictée"
            : phase === "transcribing"
              ? "Transcription en cours"
              : phase === "converting"
                ? "Préparation de l'enregistrement"
                : "Dicter (2 min au plus)"
        }
        className={cn("h-7 w-7 rounded-full", recording && "bg-status-fail text-white hover:bg-status-fail hover:text-white")}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : recording ? <Square className="h-3 w-3" /> : <Mic className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
