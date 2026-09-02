"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Check,
  Clock,
  FileText,
  FileUp,
  Upload,
  Users,
  SlidersHorizontal,
  Braces,
} from "lucide-react";
import { useVersion } from "@/contexts/VersionContext";
import {
  usePreparation,
  type PreparationBlockState,
  type PreparationSupplier,
} from "@/hooks/use-preparation";

const DocxImportModal = dynamic(
  () => import("@/components/DocxImportModal").then((m) => m.DocxImportModal),
  { ssr: false }
);
const DocumentUploadModal = dynamic(
  () =>
    import("@/components/DocumentUploadModal").then(
      (m) => m.DocumentUploadModal
    ),
  { ssr: false }
);

interface PreparationHubProps {
  rfpId: string;
}

function StateBadge({ state }: { state: PreparationBlockState }) {
  if (state === "done") {
    return (
      <Badge className="border-transparent bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400">
        Terminé
      </Badge>
    );
  }
  if (state === "partial") {
    return (
      <Badge className="border-transparent bg-orange-50 text-orange-700 hover:bg-orange-50 dark:bg-orange-950 dark:text-orange-400">
        En cours
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="font-semibold">
      À faire
    </Badge>
  );
}

function BlockIcon({
  state,
  fallback: Fallback,
}: {
  state: PreparationBlockState;
  fallback: typeof FileText;
}) {
  if (state === "done") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
        <Check className="h-[18px] w-[18px] text-emerald-500" />
      </div>
    );
  }
  if (state === "partial") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950">
        <Clock className="h-[18px] w-[18px] text-orange-500" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <Fallback className="h-[17px] w-[17px] text-slate-500" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SupplierRow({
  supplier,
  rfpId,
}: {
  supplier: PreparationSupplier;
  rfpId: string;
}) {
  const initials = supplier.name.slice(0, 2).toUpperCase();
  const hasResponses = supplier.responsesTotal > 0;
  const complete =
    hasResponses && supplier.responsesAnswered === supplier.responsesTotal;
  const ratio = hasResponses
    ? Math.round((supplier.responsesAnswered / supplier.responsesTotal) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_176px] dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            hasResponses
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800"
          }`}
        >
          {initials}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{supplier.name}</span>
          <span className="text-xs text-slate-400">
            {supplier.supplier_id_external}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {hasResponses ? (
          <>
            <div className="flex items-center gap-2">
              {complete && (
                <Check className="h-[15px] w-[15px] text-emerald-500" />
              )}
              <span className="text-[13px] text-slate-600 dark:text-slate-400">
                {supplier.responsesAnswered} / {supplier.responsesTotal}{" "}
                exigences
              </span>
            </div>
            {!complete && (
              <div className="h-1 w-32 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-1 rounded-sm bg-orange-500"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <span className="text-[13px] text-slate-400">Rien de déposé</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {supplier.documents > 0 ? (
          <>
            <FileText className="h-[15px] w-[15px] text-slate-500" />
            <Link
              href={`/dashboard/rfp/${rfpId}/documents`}
              className="text-[13px] text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
            >
              {supplier.documents} document{supplier.documents > 1 ? "s" : ""}
            </Link>
          </>
        ) : (
          <span className="text-[13px] text-slate-400">—</span>
        )}
      </div>

      <div className="flex md:justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/dashboard/rfp/${rfpId}/import/json?step=4&supplier=${supplier.id}`}
          >
            {hasResponses
              ? complete
                ? "Voir le dépôt"
                : "Compléter"
              : "Déposer"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The preparation hub: the four things an RFP needs before it can be
 * evaluated, each showing where it actually stands.
 *
 * Replaces the four-step JSON stepper. Nothing here asks for JSON — the
 * paste-a-payload path stays reachable at ../import/json for the cases the
 * file importers do not cover yet.
 */
export function PreparationHub({ rfpId }: PreparationHubProps) {
  const { activeVersion, isLoading: versionsLoading } = useVersion();
  const { preparation, isLoading, error, refetch } = usePreparation(
    versionsLoading ? null : rfpId,
    activeVersion?.id
  );

  const [isDocxImportOpen, setIsDocxImportOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const hasOpenedDocxImport = useRef(false);
  const hasOpenedUpload = useRef(false);
  if (isDocxImportOpen) hasOpenedDocxImport.current = true;
  if (isUploadOpen) hasOpenedUpload.current = true;

  const blocks = useMemo(() => {
    if (!preparation) return [];
    return [
      preparation.specification.state,
      preparation.suppliers.state,
      preparation.responses.state,
      preparation.weights.state,
    ];
  }, [preparation]);

  const nextStepMessage = useMemo(() => {
    if (!preparation) return null;
    if (preparation.specification.state === "empty") {
      return {
        title: "Commencez par le cahier des charges",
        detail:
          "Tout le reste s'appuie sur l'arborescence des exigences — fournisseurs et réponses viennent après.",
      };
    }
    if (preparation.suppliers.state === "empty") {
      return {
        title: "Ajoutez les fournisseurs consultés",
        detail:
          "Chaque fournisseur aura sa colonne de réponses et ses documents.",
      };
    }
    const missing =
      preparation.suppliers.total -
      preparation.responses.suppliersWithResponses;
    if (missing > 0) {
      return {
        title:
          missing === 1
            ? "Il reste les réponses d'un fournisseur à déposer"
            : `Il reste les réponses de ${missing} fournisseurs à déposer`,
        detail:
          "L'évaluation s'ouvrira dès qu'au moins un fournisseur aura une grille complète.",
      };
    }
    return {
      title: "La préparation est complète",
      detail: "Vous pouvez ouvrir l'évaluation quand vous voulez.",
    };
  }, [preparation]);

  if (isLoading || versionsLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-8">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !preparation) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">
            {error?.message || "Impossible de charger l'état de préparation."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => refetch()}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const { rfp, specification, suppliers, responses, weights } = preparation;
  const readOnly = preparation.userAccessLevel === "viewer";
  const canOpenEvaluation = responses.suppliersWithResponses > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-8 text-slate-900 dark:text-slate-50">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Tous les appels d&apos;offres
      </Link>

      {/* En-tête */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              {rfp.title}
            </h1>
            <Badge variant="secondary" className="font-semibold">
              Préparation
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {suppliers.total > 0
              ? `${suppliers.total} fournisseur${suppliers.total > 1 ? "s" : ""} consulté${suppliers.total > 1 ? "s" : ""}`
              : "Aucun fournisseur pour l'instant"}
            {preparation.activeVersion
              ? ` · version ${preparation.activeVersion.version_name}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/rfp/${rfpId}/summary`}>
              Voir la synthèse
            </Link>
          </Button>
          <Button disabled={!canOpenEvaluation} asChild={canOpenEvaluation}>
            {canOpenEvaluation ? (
              <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>
                Ouvrir l&apos;évaluation
              </Link>
            ) : (
              <span>Ouvrir l&apos;évaluation</span>
            )}
          </Button>
        </div>
      </div>

      {/* Où on en est */}
      {nextStepMessage && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">
                {nextStepMessage.title}
              </span>
              <span className="text-[13px] text-slate-500">
                {nextStepMessage.detail}
              </span>
            </div>
            <span className="text-[13px] tabular-nums text-slate-500">
              {blocks.filter((state) => state === "done").length} blocs sur 4
            </span>
          </div>
          <div className="flex h-1.5 gap-1">
            {blocks.map((state, index) => (
              <div
                key={index}
                className={`flex-1 rounded-sm ${
                  state === "done"
                    ? "bg-emerald-500"
                    : state === "partial"
                      ? "bg-orange-500"
                      : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bloc 1 — Cahier des charges */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <BlockIcon state={specification.state} fallback={FileText} />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">
                Cahier des charges
              </span>
              <span className="text-[13px] text-slate-500">
                {specification.state === "empty" ? (
                  "Déposez le document qui décrit vos exigences — Word ou Excel."
                ) : (
                  <>
                    {specification.requirements} exigence
                    {specification.requirements > 1 ? "s" : ""} réparties dans{" "}
                    {specification.categories} domaine
                    {specification.categories > 1 ? "s" : ""}
                    {specification.sourceDocuments[0]?.filename ? (
                      <>
                        {" · importées depuis "}
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {specification.sourceDocuments[0].filename}
                        </span>
                      </>
                    ) : null}
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <StateBadge state={specification.state} />
            {specification.state === "empty" ? (
              <Button
                size="sm"
                disabled={readOnly}
                onClick={() => setIsDocxImportOpen(true)}
              >
                <Upload className="h-3.5 w-3.5" />
                Importer un document
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/rfp/${rfpId}/tree-view`}>
                    Revoir l&apos;arborescence
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => setIsDocxImportOpen(true)}
                >
                  Compléter
                </Button>
              </>
            )}
          </div>
        </div>

        {specification.state === "empty" ? (
          <div className="px-5 py-6">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setIsDocxImportOpen(true)}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                <FileUp className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-semibold">
                  Importer votre cahier des charges
                </span>
                <span className="text-[13px] text-slate-500">
                  Word ou Excel — nous en tirons les domaines et les exigences.
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 px-5 py-3.5">
            <Stat label="Domaines" value={specification.categories} />
            <Stat label="Exigences" value={specification.requirements} />
            <Stat label="Obligatoires" value={specification.mandatory} />
            <Stat label="Facultatives" value={specification.optional} />
          </div>
        )}
      </section>

      {/* Bloc 2 — Fournisseurs */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <BlockIcon state={suppliers.state} fallback={Users} />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">
                Fournisseurs consultés
              </span>
              <span className="text-[13px] text-slate-500">
                {suppliers.total === 0
                  ? "Ajoutez les entreprises que vous avez consultées."
                  : `${suppliers.total} fournisseur${suppliers.total > 1 ? "s" : ""} · contact renseigné pour ${suppliers.withContact} d'entre eux`}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <StateBadge state={suppliers.state} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/rfp/${rfpId}/summary`}>
                {suppliers.total === 0 ? "Ajouter" : "Gérer la liste"}
              </Link>
            </Button>
          </div>
        </div>

        {suppliers.total > 0 && (
          <div className="flex flex-wrap gap-2 px-5 py-3.5">
            {suppliers.items.map((supplier) => (
              <span
                key={supplier.id}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 py-0 pl-1.5 pr-3 text-[13px] dark:border-slate-800"
              >
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  {supplier.name.slice(0, 2).toUpperCase()}
                </span>
                {supplier.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Bloc 3 — Réponses */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <BlockIcon state={responses.state} fallback={FileUp} />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">
                Réponses des fournisseurs
              </span>
              <span className="text-[13px] text-slate-500">
                {suppliers.total === 0
                  ? "Disponible une fois les fournisseurs ajoutés."
                  : `${responses.suppliersWithResponses} fournisseur${responses.suppliersWithResponses > 1 ? "s" : ""} sur ${suppliers.total} ${responses.suppliersWithResponses > 1 ? "ont" : "a"} déposé des réponses`}
              </span>
            </div>
          </div>
          <StateBadge state={responses.state} />
        </div>

        {suppliers.total > 0 && (
          <>
            <div className="hidden grid-cols-[minmax(0,2.1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_176px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 md:grid dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Fournisseur
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Grille de réponses
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pièces jointes
              </span>
              <span />
            </div>

            {suppliers.items.map((supplier) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                rfpId={rfpId}
              />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[13px] text-slate-500">
                Les pièces jointes d&apos;un fournisseur (mémoire technique,
                annexes) se déposent avec les documents de l&apos;appel
                d&apos;offres.
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={readOnly}
                onClick={() => setIsUploadOpen(true)}
              >
                <FileUp className="h-3.5 w-3.5" />
                Déposer des documents
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Bloc 4 — Pondérations */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3.5">
            <BlockIcon state={weights.state} fallback={SlidersHorizontal} />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">Pondérations</span>
              <span className="text-[13px] text-slate-500">
                {weights.customisedRequirements > 0
                  ? `${weights.customisedRequirements} exigence${weights.customisedRequirements > 1 ? "s" : ""} pondérée${weights.customisedRequirements > 1 ? "s" : ""} différemment.`
                  : "Toutes les exigences comptent pour 1. Ajustable à tout moment, y compris après l'évaluation."}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {weights.state === "empty" ? (
              <Badge
                variant="outline"
                className="border-slate-200 text-slate-500"
              >
                Facultatif
              </Badge>
            ) : (
              <StateBadge state={weights.state} />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/rfp/${rfpId}/summary?tab=weights`}>
                {weights.state === "empty" ? "Définir" : "Ajuster"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Voie de secours */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950">
        <Braces className="h-4 w-4 text-slate-400" />
        <span className="text-[13px] text-slate-500">
          Vos données sont déjà structurées ailleurs&nbsp;?
        </span>
        <Link
          href={`/dashboard/rfp/${rfpId}/import/json`}
          className="text-[13px] font-medium underline underline-offset-2"
        >
          Import JSON
        </Link>
        <span className="text-slate-300">·</span>
        <Link
          href="/dashboard/settings/tokens"
          className="text-[13px] font-medium underline underline-offset-2"
        >
          Depuis Claude
        </Link>
      </div>

      {hasOpenedDocxImport.current && (
        <DocxImportModal
          rfpId={rfpId}
          isOpen={isDocxImportOpen}
          onOpenChange={(open) => {
            setIsDocxImportOpen(open);
            if (!open) refetch();
          }}
        />
      )}

      {hasOpenedUpload.current && (
        <DocumentUploadModal
          rfpId={rfpId}
          rfpTitle={rfp.title}
          isOpen={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
