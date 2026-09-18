"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalyzeRFP } from "@/hooks/use-analyze-rfp";
import type { PreparationSupplier } from "@/hooks/use-preparation";

interface LaunchAnalysisDialogProps {
  rfpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: PreparationSupplier[];
  /** Total responses in scope when every supplier is selected. */
  responsesTotal: number;
  responsesScored: number;
}

const ANALYSIS_START_KEY = (rfpId: string) => `rfp-analysis-start-${rfpId}`;

/**
 * Launching the AI analysis states what will run (scope, volume, an order of
 * magnitude for the wait) before anything happens, then hands over to the
 * status strip. The system prompt is persisted with the consultation.
 */
export function LaunchAnalysisDialog({
  rfpId,
  open,
  onOpenChange,
  suppliers,
  responsesTotal,
  responsesScored,
}: LaunchAnalysisDialogProps) {
  const queryClient = useQueryClient();
  const analyze = useAnalyzeRFP();
  const [scope, setScope] = useState<string>("all");
  const [prompt, setPrompt] = useState("");

  const { data: rfp } = useQuery<{
    analysis_settings?: { system_prompt?: string } | null;
  }>({
    queryKey: ["rfp", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}`);
      if (!res.ok) throw new Error("Consultation introuvable");
      return res.json();
    },
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (open && rfp?.analysis_settings?.system_prompt && !prompt) {
      setPrompt(rfp.analysis_settings.system_prompt);
    }
  }, [open, rfp, prompt]);

  const selected =
    scope === "all" ? null : suppliers.find((s) => s.id === scope) ?? null;
  const inScope = selected ? selected.responsesTotal : responsesTotal;
  const alreadyScored = selected ? selected.responsesScored : responsesScored;
  const rerun = alreadyScored > 0;

  const handleLaunch = () => {
    analyze.mutate(
      {
        rfpId,
        systemPrompt: prompt.trim() || undefined,
        supplierId: selected?.id,
      },
      {
        onSuccess: (data) => {
          try {
            window.localStorage.setItem(
              ANALYSIS_START_KEY(rfpId),
              JSON.stringify({ startedAt: Date.now(), total: data.total_responses })
            );
          } catch {
            // storage unavailable: the strip still shows live counts
          }
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => undefined);
          }
          toast.success(
            `Analyse lancée sur ${data.total_responses} réponses. Vous serez prévenu à la fin.`
          );
          queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? `L'analyse n'a pas démarré : ${error.message}`
              : "L'analyse n'a pas démarré."
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {rerun ? "Relancer l'analyse IA" : "Lancer l'analyse IA"}
          </DialogTitle>
          <DialogDescription>
            Chaque réponse reçoit une note de 0 à 5 et un commentaire. L'analyse
            tourne en arrière-plan ; une ligne d'état suit son avancement et vous
            prévient à la fin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="analysis-scope">Périmètre</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="analysis-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Tous les fournisseurs ({responsesTotal} réponses)
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.responsesTotal} réponses)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-y border-border py-2 text-sm">
            <dt className="text-muted-foreground">Réponses à analyser</dt>
            <dd className="tnum text-right">{inScope}</dd>
            <dt className="text-muted-foreground">Déjà notées</dt>
            <dd className="tnum text-right">{alreadyScored}</dd>
            <dt className="text-muted-foreground">Ordre de grandeur</dt>
            <dd className="text-right">
              {inScope > 400 ? "plusieurs dizaines de minutes" : inScope > 100 ? "quelques dizaines de minutes" : "quelques minutes"}
            </dd>
          </dl>
          {rerun && (
            <p className="text-sm text-muted-foreground">
              Les notes IA existantes du périmètre seront remplacées. Les notes et
              commentaires manuels sont conservés.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="analysis-prompt">Consignes pour l'analyse</Label>
            <Textarea
              id="analysis-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contexte de la consultation, langue attendue, points d'attention"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={analyze.isLoading || inScope === 0}
          >
            {analyze.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {rerun ? "Relancer" : "Lancer l'analyse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function readAnalysisStart(rfpId: string): { startedAt: number; total: number } | null {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_START_KEY(rfpId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
