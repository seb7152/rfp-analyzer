"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSoutenanceMutations, type SessionDetail } from "@/hooks/use-soutenances";
import { formatDateTime, formatUsd } from "@/lib/format";
import { EditableDoc, StepPanel } from "./DocPanel";

/**
 * The compte rendu of the séance, written from the transcript by the
 * « Soutenances » agent in the same run that plans the proposals. Editable,
 * exportable like the brief.
 */
export function ReportPanel({ rfpId, detail, canEdit }: { rfpId: string; detail: SessionDetail; canEdit: boolean }) {
  const { analyze, patchSession } = useSoutenanceMutations(rfpId);
  const session = detail.session;
  const job = detail.reportJob;
  const hasTranscript = !!session?.transcript_source && (session.transcript_segments?.length ?? 0) > 0;
  const running = job?.status === "pending" || job?.status === "running";
  const has = !!session?.report_markdown;
  const [confirm, setConfirm] = useState(false);
  const mine = detail.overview.sessions.find((s) => s.supplier.id === detail.supplier.id);
  const hasProposals = (mine?.analysis.runs ?? 0) > 0;

  const launch = async () => {
    setConfirm(false);
    try {
      await analyze.mutateAsync({ supplierId: detail.supplier.id });
      toast.success("Analyse de la séance lancée : compte rendu, puis propositions.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'analyse n'a pas pu être lancée.");
    }
  };

  const state = running
    ? "Rédaction en cours à partir du transcript"
    : has
      ? `Généré le ${formatDateTime(session!.report_generated_at)}${detail.overview.agents.soutenance ? ` · agent ${detail.overview.agents.soutenance.name}` : ""}${job && Number(job.cost) > 0 ? ` · ${formatUsd(Number(job.cost))}` : ""}${session!.report_edited_at ? ` · modifié le ${formatDateTime(session!.report_edited_at)}` : ""}`
      : job?.status === "failed"
        ? `Échec : ${job.error ?? "analyse interrompue"}`
        : "Ce que la séance a apporté : résumé, par domaine, écarts entre l'écrit et l'oral, engagements, questions restées ouvertes.";

  return (
    <StepPanel
      id="compte-rendu"
      title="Compte rendu"
      dot={has ? "done" : running ? "now" : "todo"}
      state={state}
      actions={
        canEdit && (
          <Button type="button" variant={has ? "ghost" : "outline"} size="sm" disabled={!hasTranscript || running || analyze.isPending} title={!hasTranscript ? "Chargez d'abord le transcript" : undefined} onClick={() => (has || hasProposals ? setConfirm(true) : launch())}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : has ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {has ? "Régénérer" : "Analyser la séance"}
          </Button>
        )
      }
    >
      <EditableDoc
        content={has ? session!.report_markdown : null}
        title={`Compte rendu soutenance ${detail.supplier.name}`}
        canEdit={canEdit}
        onSave={(markdown) => patchSession.mutateAsync({ supplierId: detail.supplier.id, report_markdown: markdown })}
        saving={patchSession.isPending}
        emptyText={
          running
            ? "Le compte rendu arrive dans deux à trois minutes, les propositions suivent ; la page se rafraîchit seule."
            : hasTranscript
              ? "Le transcript est là. L'analyse rédige le compte rendu et propose ce qui change dans l'évaluation."
              : "Le compte rendu se rédige à partir du transcript de la séance."
        }
      />

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyser à nouveau la séance ?</AlertDialogTitle>
            <AlertDialogDescription>Le compte rendu, y compris vos modifications, sera remplacé. Les propositions déjà reprises ou écartées restent ; celles encore à décider deviennent obsolètes et sont reproposées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={launch}>Analyser</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StepPanel>
  );
}
