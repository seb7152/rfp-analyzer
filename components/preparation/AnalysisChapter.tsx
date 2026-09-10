"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultation } from "@/hooks/use-consultation";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { StateGlyph } from "@/components/shell/StateGlyph";
import { LaunchAnalysisDialog } from "@/components/preparation/LaunchAnalysisDialog";
import { formatDuration, formatDateTime } from "@/lib/format";
import type { ChapterState } from "@/hooks/use-consultation";

/**
 * Chapter 2: the asynchronous AI analysis, made legible. What runs, how far
 * it is, how long is left, per supplier; and the one action to launch or
 * relaunch it.
 */
export function AnalysisChapter({ rfpId }: { rfpId: string }) {
  const { preparation, analysis, access, isLoading, error, refetch } =
    useConsultation(rfpId);
  const [launchOpen, setLaunchOpen] = useState(false);

  if (isLoading) return <PageState kind="loading" title="Chargement de l'analyse" />;
  if (error || !preparation) {
    return (
      <PageState
        kind="error"
        title="L'état de l'analyse n'a pas pu être chargé"
        description={error?.message}
        action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>}
      />
    );
  }

  const canLaunch = access === "owner" || access === "admin";
  const processing = analysis.status === "processing";
  const percent =
    analysis.total > 0 ? Math.round((analysis.scored / analysis.total) * 100) : 0;
  const eta = formatDuration(analysis.etaSeconds);
  const suppliers = preparation.suppliers.items;

  const lead = processing
    ? `${analysis.scored} réponses notées sur ${analysis.total}${eta ? `, environ ${eta} restantes` : ", estimation en cours"}. Vous pouvez quitter cette page ; vous serez prévenu à la fin.`
    : analysis.status === "failed"
      ? "La dernière analyse s'est interrompue. Les notes déjà produites sont conservées ; relancez sur le périmètre manquant."
      : analysis.total === 0
        ? "Aucune réponse déposée. L'analyse se lance une fois les réponses des fournisseurs importées."
        : analysis.scored === 0
          ? "Chaque réponse recevra une note de 0 à 5 et un commentaire, que les experts confirment ou corrigent."
          : analysis.scored < analysis.total
            ? `${analysis.total - analysis.scored} réponses n'ont pas encore de note IA.`
            : "Toutes les réponses ont une note IA. Les experts peuvent évaluer.";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        number={2}
        title="Analyse IA"
        lead={lead}
        actions={
          canLaunch && !processing && analysis.total > 0 ? (
            <Button onClick={() => setLaunchOpen(true)}>
              <Sparkles className="h-4 w-4" />
              {analysis.scored > 0 ? "Relancer l'analyse" : "Lancer l'analyse IA"}
            </Button>
          ) : !processing && analysis.scored > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>Ouvrir l'évaluation</Link>
            </Button>
          ) : null
        }
      />

      <section className="border-b border-border px-4 py-4 md:px-6" aria-live="polite">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">
            {processing ? "En cours" : analysis.status === "failed" ? "Interrompue" : analysis.scored > 0 ? "Terminée" : "Non lancée"}
          </span>
          <span className="tnum text-sm text-muted-foreground">
            {analysis.scored}/{analysis.total} · {percent} %
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-muted" aria-hidden>
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Démarrée</dt>
            <dd>{formatDateTime(analysis.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dernière mise à jour</dt>
            <dd>{formatDateTime(preparation.analysis.status?.lastUpdatedAt ?? preparation.analysis.status?.completedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Temps restant estimé</dt>
            <dd>{processing ? (eta ?? "estimation en cours") : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fournisseurs</dt>
            <dd className="tnum">{suppliers.length}</dd>
          </div>
        </dl>
      </section>

      <section className="px-4 py-4 md:px-6" aria-labelledby="analysis-suppliers">
        <h2 id="analysis-suppliers" className="mb-2 text-sm font-semibold">
          Par fournisseur
        </h2>
        {suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fournisseur déclaré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-3 font-semibold">Fournisseur</th>
                <th className="py-1 pr-3 text-right font-semibold">Notées</th>
                <th className="py-1 pr-3 text-right font-semibold">Réponses</th>
                <th className="w-40 py-1 font-semibold">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const pct = s.responsesTotal > 0 ? Math.round((s.responsesScored / s.responsesTotal) * 100) : 0;
                const state: ChapterState =
                  s.responsesTotal === 0 || s.responsesScored === 0
                    ? "empty"
                    : s.responsesScored < s.responsesTotal
                      ? processing
                        ? "processing"
                        : "partial"
                      : "done";
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <StateGlyph state={state} />
                        {s.name}
                      </span>
                    </td>
                    <td className="tnum py-2 pr-3 text-right">{s.responsesScored}</td>
                    <td className="tnum py-2 pr-3 text-right">{s.responsesTotal}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted" aria-hidden>
                          <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="tnum w-10 text-right text-xs text-muted-foreground">{pct} %</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <LaunchAnalysisDialog
        rfpId={rfpId}
        open={launchOpen}
        onOpenChange={setLaunchOpen}
        suppliers={suppliers}
        responsesTotal={analysis.total}
        responsesScored={analysis.scored}
      />
    </div>
  );
}
