"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
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
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { AssignmentMatrix } from "@/components/agents/AssignmentMatrix";
import { RunsList, SummaryTable } from "@/components/agents/RunsProgress";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { useAgents } from "@/hooks/use-agents";
import { isRunActive, useAgentAssignments, useAgentRuns, useLaunchEstimate, useLaunchRuns } from "@/hooks/use-rfp-agents";
import { formatPercent, formatTokens, formatUsd } from "@/lib/format";

/**
 * Consultation › Agents: who covers which domain, what a launch would cost,
 * the analyses in progress and their outcome.
 */
export default function ConsultationAgentsPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { preparation, access, isLoading } = useConsultation(rfpId);
  const { activeVersion } = useVersion();
  const versionId = activeVersion?.id ?? null;
  const assignments = useAgentAssignments(rfpId);
  const { data: rfp } = useQuery<{ organization_id: string }>({
    queryKey: ["rfp", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}`);
      if (!res.ok) throw new Error("Consultation introuvable");
      return res.json();
    },
    staleTime: 60_000,
  });
  const agents = useAgents(rfp?.organization_id ?? null);
  const runs = useAgentRuns(rfpId, versionId);
  const anyActive = runs.data?.runs.some(isRunActive) ?? false;
  const estimate = useLaunchEstimate(rfpId, !anyActive);
  const launch = useLaunchRuns(rfpId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || assignments.isLoading) return <PageState kind="loading" title="Chargement des agents" />;
  if (!preparation) return <PageState kind="error" title="La consultation n'a pas pu être chargée" />;
  if (assignments.error || !assignments.data) {
    return (
      <PageState
        kind="error"
        title="Les affectations n'ont pas pu être chargées"
        description={assignments.error?.message}
        action={<Button variant="outline" onClick={() => assignments.refetch()}>Réessayer</Button>}
      />
    );
  }

  const canPilot = access === "owner" || access === "admin";
  const coverage = assignments.data.coverage;
  const coveragePercent = coverage.total > 0 ? (coverage.covered / coverage.total) * 100 : 0;
  const est = estimate.data;

  const onLaunch = async () => {
    setConfirmOpen(false);
    try {
      const result = await launch.mutateAsync();
      toast.success(`${result.runIds.length} analyses lancées.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le lancement a échoué.");
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-8">
      <PageHeader
        title="Agents"
        lead="Affectez un agent à chaque domaine, puis lancez l'analyse : chaque agent relit les réponses de chaque fournisseur sur son domaine et propose une note sourcée, que les experts acceptent ou rejettent."
        actions={
          canPilot ? (
            <Button onClick={() => setConfirmOpen(true)} disabled={anyActive || !est || est.totals.runs === 0 || launch.isPending}>
              <Play className="h-4 w-4" />
              Lancer l&apos;analyse
            </Button>
          ) : undefined
        }
      />

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="agents-matrix">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5 md:px-5">
          <h2 id="agents-matrix" className="text-base font-semibold">
            Affectation par domaine
          </h2>
          <span className="text-xs text-muted-foreground">
            <span className="num text-foreground">{coverage.covered}</span> exigences couvertes sur <span className="num text-foreground">{coverage.total}</span>
            {coverage.total > 0 && <span className="num"> · {formatPercent(coveragePercent)}</span>}
            {coverage.total > coverage.covered && <span className="num"> · {coverage.total - coverage.covered} non couvertes</span>}
          </span>
        </div>
        {agents.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement des agents.</p>
        ) : agents.error ? (
          <p className="px-4 py-8 text-center text-sm text-status-fail">{agents.error.message}</p>
        ) : (agents.data?.agents.length ?? 0) === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun agent dans l&apos;organisation.{" "}
            <Link href="/dashboard/agents" className="text-accent-foreground underline underline-offset-2">
              Créer un agent
            </Link>
          </p>
        ) : (
          <AssignmentMatrix rfpId={rfpId} data={assignments.data} agents={agents.data?.agents ?? []} canEdit={canPilot && !anyActive} />
        )}
        {!canPilot && <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground md:px-5">Seul le pilote de la consultation modifie les affectations.</p>}
      </section>

      <section className="panel mx-4 px-4 py-4 md:mx-8 md:px-5" aria-live="polite">
        <h2 className="text-base font-semibold">Estimation</h2>
        {anyActive ? (
          <p className="mt-1 text-sm text-muted-foreground">Une analyse est en cours ; l&apos;estimation reviendra à la fin.</p>
        ) : estimate.isLoading ? (
          <p className="mt-1 text-sm text-muted-foreground">Calcul sur le contexte réel de chaque analyse.</p>
        ) : estimate.error ? (
          <p className="mt-1 text-sm text-status-fail">{estimate.error.message}</p>
        ) : est ? (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Analyses</dt>
                <dd className="num">{est.totals.runs}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Exigences</dt>
                <dd className="num">{est.totals.requirements}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tokens estimés</dt>
                <dd className="num">
                  {formatTokens(est.totals.prompt_tokens)} entrée · {formatTokens(est.totals.completion_tokens)} sortie
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Coût estimé</dt>
                <dd className="num">{est.totals.cost !== null ? formatUsd(est.totals.cost) : "—"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Approximatif : tokens comptés à partir de la longueur du contexte, sans cache de prompt ; le coût réel renvoyé par OpenRouter remplace l&apos;estimation à la fin de chaque analyse.
              {!est.catalogueAvailable && " Catalogue OpenRouter indisponible : coût non calculé."}
              {est.catalogueAvailable && est.totals.cost === null && est.totals.runs > 0 && " Un modèle affecté n'est pas dans le catalogue : coût non calculé."}
              {est.totals.runs === 0 && " Affectez un agent à un domaine qui a des réponses pour obtenir une estimation."}
              {" "}Version {est.version.version_number}
              {est.version.version_name ? ` · ${est.version.version_name}` : ""}.
            </p>
          </>
        ) : null}
      </section>

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="agents-runs">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5 md:px-5">
          <h2 id="agents-runs" className="text-base font-semibold">
            Avancement
          </h2>
          {runs.data && runs.data.runs.length > 0 && (
            <span className="num text-xs text-muted-foreground">
              {runs.data.runs.filter((r) => r.status === "completed").length}/{runs.data.runs.length} terminées
              {" · "}
              {formatUsd(runs.data.runs.reduce((n, r) => n + Number(r.cost), 0), 3)}
            </span>
          )}
        </div>
        {runs.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement de l&apos;avancement.</p>
        ) : runs.error ? (
          <p className="px-4 py-8 text-center text-sm text-status-fail">{runs.error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <RunsList rfpId={rfpId} runs={runs.data?.runs ?? []} canRetry={canPilot} />
          </div>
        )}
      </section>

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="agents-summary">
        <h2 id="agents-summary" className="border-b border-border px-4 py-2.5 text-base font-semibold md:px-5">
          Propositions par agent
        </h2>
        {runs.data ? <SummaryTable summary={runs.data.summary} /> : null}
        {runs.data && runs.data.summary.some((s) => s.proposed > 0) && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground md:px-5">
            Les propositions se décident réponse par réponse dans{" "}
            <Link href={`/dashboard/rfp/${rfpId}/evaluate`} className="text-accent-foreground underline underline-offset-2">
              l&apos;évaluation
            </Link>
            .
          </p>
        )}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lancer l&apos;analyse</AlertDialogTitle>
            <AlertDialogDescription>
              {est
                ? `${est.totals.runs} analyses sur ${est.totals.requirements} exigences, environ ${formatTokens(est.totals.prompt_tokens + est.totals.completion_tokens)} tokens${est.totals.cost !== null ? ` et ${formatUsd(est.totals.cost)}` : ""}. Les propositions encore en attente d'une décision sur ce périmètre seront marquées obsolètes ; celles déjà acceptées ou rejetées sont conservées.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onLaunch}>Lancer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
