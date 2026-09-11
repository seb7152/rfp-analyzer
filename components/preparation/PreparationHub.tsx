"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  FileText,
  Plus,
  Loader2,
  ListTree,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreparation, type PreparationSupplier } from "@/hooks/use-preparation";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { StateGlyph, stateLabel } from "@/components/shell/StateGlyph";
import { LaunchAnalysisDialog } from "@/components/preparation/LaunchAnalysisDialog";
import type { ChapterState } from "@/hooks/use-consultation";
import { formatDate, formatDuration } from "@/lib/format";

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

/** One numbered article of the preparation plan. */
function Article({
  number,
  title,
  state,
  stateText,
  summary,
  actions,
  children,
  id,
}: {
  number: string;
  title: string;
  state: ChapterState;
  stateText?: string;
  summary?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={`art-${number}`} className="border-b border-border">
      <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <StateGlyph state={state} />
          <h2 id={`art-${number}`} className="flex items-baseline gap-2 text-base font-semibold">
            <span className="article-no">{number}</span>
            <span>{title}</span>
          </h2>
          <span className="text-xs text-muted-foreground">{stateText ?? stateLabel(state)}</span>
          {summary && (
            <span className="hidden text-sm text-muted-foreground md:inline">
              · {summary}
            </span>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="px-4 pb-4 md:px-6">{children}</div>}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className="tnum font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function AddSupplierForm({
  rfpId,
  onAdded,
}: {
  rfpId: string;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const id = trimmed
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toUpperCase()
        .slice(0, 24);
      const res = await fetch(`/api/rfps/${rfpId}/suppliers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppliers: [{ id, name: trimmed }] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Le fournisseur n'a pas été ajouté.");
      }
      setName("");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le fournisseur n'a pas été ajouté.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        aria-label="Nom du fournisseur"
        placeholder="Nom du fournisseur"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-56"
      />
      <Button type="submit" size="sm" variant="outline" disabled={saving || !name.trim()}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Ajouter
      </Button>
    </form>
  );
}

function SupplierRow({
  rfpId,
  supplier,
  requirementsTotal,
  readOnly,
  onUpload,
}: {
  rfpId: string;
  supplier: PreparationSupplier;
  requirementsTotal: number;
  readOnly: boolean;
  onUpload: () => void;
}) {
  const hasResponses = supplier.responsesTotal > 0;
  const complete = hasResponses && supplier.responsesTotal >= requirementsTotal;
  const state: ChapterState = complete ? "done" : hasResponses ? "partial" : "empty";
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <StateGlyph state={state} />
          <span className="font-medium">{supplier.name}</span>
        </div>
        {supplier.contact_email && (
          <span className="block pl-[22px] text-xs text-muted-foreground">
            {supplier.contact_name ? `${supplier.contact_name} · ` : ""}
            {supplier.contact_email}
          </span>
        )}
      </td>
      <td className="tnum py-2 pr-3 text-right">
        {hasResponses ? `${supplier.responsesTotal}/${requirementsTotal}` : "—"}
      </td>
      <td className="tnum hidden py-2 pr-3 text-right md:table-cell">
        {supplier.documents > 0 ? supplier.documents : "—"}
      </td>
      <td className="py-2 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={onUpload} disabled={readOnly}>
            <FileUp className="h-3.5 w-3.5" />
            Documents
          </Button>
          <Button variant={hasResponses ? "ghost" : "outline"} size="xs" asChild disabled={readOnly}>
            <Link href={`/dashboard/rfp/${rfpId}/import/json?step=4&supplier=${supplier.id}`}>
              {complete ? "Voir le dépôt" : hasResponses ? "Compléter" : "Déposer les réponses"}
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

/**
 * The preparation plan: what a consultation needs before evaluation, each
 * article stating where it stands and offering its one action. The header
 * names the single next action.
 */
export function PreparationHub({ rfpId }: PreparationHubProps) {
  const { activeVersion, isLoading: versionsLoading } = useVersion();
  const queryClient = useQueryClient();
  const { preparation, isLoading, error, refetch } = usePreparation(
    versionsLoading ? null : rfpId,
    activeVersion?.id
  );
  const { analysis } = useConsultation(rfpId);

  const [isDocxImportOpen, setIsDocxImportOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const hasOpenedDocxImport = useRef(false);
  const hasOpenedUpload = useRef(false);
  if (isDocxImportOpen) hasOpenedDocxImport.current = true;
  if (isUploadOpen) hasOpenedUpload.current = true;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
    queryClient.invalidateQueries({ queryKey: ["requirements-tree", rfpId] });
    refetch();
  };

  const next = useMemo(() => {
    if (!preparation) return null;
    const p = preparation;
    if (p.specification.state === "empty") {
      return {
        title: "Prochaine action : importer le cahier des charges",
        detail: "Les domaines et les exigences en sont extraits ; fournisseurs et réponses viennent ensuite.",
        action: { label: "Importer le cahier des charges", onClick: () => setIsDocxImportOpen(true) },
      };
    }
    if (p.suppliers.state === "empty") {
      return {
        title: "Prochaine action : déclarer les fournisseurs consultés",
        detail: "Chaque fournisseur aura sa colonne de réponses et ses documents.",
        action: { label: "Déclarer un fournisseur", href: "#fournisseurs" },
      };
    }
    const missing = p.suppliers.total - p.responses.suppliersWithResponses;
    if (missing > 0) {
      return {
        title:
          missing === 1
            ? "Prochaine action : déposer les réponses du dernier fournisseur"
            : `Prochaine action : déposer les réponses de ${missing} fournisseurs`,
        detail: "L'évaluation s'ouvre dès qu'un fournisseur a une grille complète.",
        action: { label: "Déposer des réponses", href: "#reponses" },
      };
    }
    if (analysis.status === "processing") {
      return {
        title: "Analyse IA en cours",
        detail: `${analysis.scored}/${analysis.total} réponses notées${analysis.etaSeconds ? `, environ ${formatDuration(analysis.etaSeconds)} restantes` : ""}.`,
        action: { label: "Suivre l'analyse", href: `/dashboard/rfp/${rfpId}/analyse` },
      };
    }
    if (analysis.scored === 0 && analysis.total > 0) {
      return {
        title: "Prochaine action : lancer l'analyse IA",
        detail: "Chaque réponse reçoit une note et un commentaire, que les experts confirment ou corrigent.",
        action: { label: "Lancer l'analyse IA", onClick: () => setIsLaunchOpen(true) },
      };
    }
    return {
      title: "Prochaine action : ouvrir l'évaluation",
      detail: "La préparation est complète : référentiel, fournisseurs et réponses sont en place.",
      action: { label: "Ouvrir l'évaluation", href: `/dashboard/rfp/${rfpId}/evaluate` },
    };
  }, [preparation, analysis, rfpId]);

  if (isLoading || versionsLoading) {
    return <PageState kind="loading" title="Chargement du plan de préparation" />;
  }
  if (error || !preparation) {
    return (
      <PageState
        kind="error"
        title="Le plan de préparation n'a pas pu être chargé"
        description={error?.message}
        action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>}
      />
    );
  }

  const { rfp, specification, suppliers, responses, weights } = preparation;
  const readOnly = preparation.userAccessLevel === "viewer";
  const canEvaluate = responses.suppliersWithResponses > 0;

  const analysisState: ChapterState =
    analysis.status === "processing"
      ? "processing"
      : analysis.total === 0 || analysis.scored === 0
        ? "empty"
        : analysis.scored < analysis.total
          ? "partial"
          : "done";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        number={1}
        title="Préparation"
        lead={next?.detail}
        actions={
          next?.action && !readOnly ? (
            "href" in next.action && next.action.href ? (
              <Button asChild>
                <Link href={next.action.href}>{next.action.label}</Link>
              </Button>
            ) : "onClick" in next.action ? (
              <Button onClick={next.action.onClick}>{next.action.label}</Button>
            ) : null
          ) : canEvaluate ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>Ouvrir l'évaluation</Link>
            </Button>
          ) : null
        }
      >
        {next && (
          <p className="mt-2 text-sm font-semibold text-accent-foreground">{next.title}</p>
        )}
      </PageHeader>

      <Article
        number="1.1"
        title="Cahier des charges et référentiel"
        state={specification.state}
        summary={
          specification.requirements > 0
            ? `${specification.categories} domaines, ${specification.requirements} exigences`
            : undefined
        }
        actions={
          specification.state === "done" ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/rfp/${rfpId}/referentiel`}>
                  <ListTree className="h-3.5 w-3.5" />
                  Relire l'arborescence
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDocxImportOpen(true)} disabled={readOnly}>
                Importer un complément
              </Button>
            </>
          ) : undefined
        }
      >
        {specification.state === "empty" ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setIsDocxImportOpen(true)}
              className="flex flex-1 items-center gap-3 rounded-md border border-dashed border-input px-4 py-4 text-left transition-colors duration-150 hover:border-primary hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span>
                <span className="block text-sm font-semibold">Importer le cahier des charges</span>
                <span className="block text-xs text-muted-foreground">
                  Document Word ; les domaines et les exigences sont détectés et relus avant import.
                </span>
              </span>
            </button>
            <div className="flex flex-col gap-1 text-sm">
              <Link href={`/dashboard/rfp/${rfpId}/import/json`} className="text-muted-foreground hover:text-foreground">
                Depuis un tableur ou un fichier JSON
              </Link>
              <Link href="/dashboard/settings/tokens" className="text-muted-foreground hover:text-foreground">
                Depuis un agent externe (jeton d'accès)
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Figure label="domaines" value={specification.categories} />
            <Figure label="exigences" value={specification.requirements} />
            <Figure label="obligatoires" value={specification.mandatory} />
            <Figure label="facultatives" value={specification.optional} />
            {specification.sourceDocuments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {specification.sourceDocuments.map((d) => d.filename).filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        )}
      </Article>

      <Article
        id="fournisseurs"
        number="1.2"
        title="Fournisseurs consultés"
        state={suppliers.state}
        summary={suppliers.total > 0 ? `${suppliers.total} déclarés` : undefined}
        actions={!readOnly ? <AddSupplierForm rfpId={rfpId} onAdded={refresh} /> : undefined}
      >
        {suppliers.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun fournisseur déclaré. Chaque fournisseur ajouté reçoit une grille de {specification.requirements || "n"} réponses à déposer.
          </p>
        ) : null}
      </Article>

      <Article
        id="reponses"
        number="1.3"
        title="Réponses des fournisseurs"
        state={responses.state}
        summary={
          suppliers.total > 0
            ? `${responses.suppliersWithResponses}/${suppliers.total} fournisseurs avec réponses`
            : undefined
        }
        actions={
          suppliers.total > 0 && !readOnly ? (
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
              <FileUp className="h-3.5 w-3.5" />
              Déposer des documents
            </Button>
          ) : undefined
        }
      >
        {suppliers.total === 0 ? (
          <p className="text-sm text-muted-foreground">Déclarez d'abord les fournisseurs.</p>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1 pr-3 font-semibold">Fournisseur</th>
                  <th className="py-1 pr-3 text-right font-semibold">Réponses</th>
                  <th className="hidden py-1 pr-3 text-right font-semibold md:table-cell">Documents</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {suppliers.items.map((s) => (
                  <SupplierRow
                    key={s.id}
                    rfpId={rfpId}
                    supplier={s}
                    requirementsTotal={responses.requirementsTotal}
                    readOnly={readOnly}
                    onUpload={() => setIsUploadOpen(true)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Article>

      <Article
        number="1.4"
        title="Analyse IA"
        state={analysisState}
        stateText={
          analysisState === "processing"
            ? "En cours"
            : analysisState === "partial"
              ? "Partielle"
              : analysisState === "done"
                ? "Terminée"
                : "À lancer"
        }
        summary={
          analysis.total > 0 ? `${analysis.scored}/${analysis.total} réponses notées` : undefined
        }
        actions={
          canEvaluate && !readOnly ? (
            analysis.status === "processing" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/rfp/${rfpId}/analyse`}>Suivre l'analyse</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsLaunchOpen(true)}>
                <Sparkles className="h-3.5 w-3.5" />
                {analysis.scored > 0 ? "Relancer" : "Lancer l'analyse IA"}
              </Button>
            )
          ) : undefined
        }
      >
        {!canEvaluate && (
          <p className="text-sm text-muted-foreground">
            L'analyse se lance une fois des réponses déposées.
          </p>
        )}
      </Article>

      <Article
        number="1.5"
        title="Pondérations"
        state={weights.state === "done" ? "done" : "neutral"}
        summary={
          weights.state === "done"
            ? `${weights.customisedRequirements} exigences pondérées`
            : "facultatif, poids identiques par défaut"
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/rfp/${rfpId}/parametres#ponderations`}>
              Régler les pondérations
            </Link>
          </Button>
        }
      />

      <p className="px-4 py-3 text-xs text-muted-foreground md:px-6">
        Consultation créée le {formatDate(rfp.created_at)}
        {preparation.activeVersion ? ` · version ${preparation.activeVersion.version_name}` : ""}.
      </p>

      {hasOpenedDocxImport.current && (
        <DocxImportModal
          rfpId={rfpId}
          isOpen={isDocxImportOpen}
          onOpenChange={(open) => {
            setIsDocxImportOpen(open);
            if (!open) refresh();
          }}
        />
      )}
      {hasOpenedUpload.current && (
        <DocumentUploadModal
          rfpId={rfpId}
          rfpTitle={rfp.title}
          isOpen={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadSuccess={refresh}
        />
      )}
      <LaunchAnalysisDialog
        rfpId={rfpId}
        open={isLaunchOpen}
        onOpenChange={setIsLaunchOpen}
        suppliers={suppliers.items}
        responsesTotal={analysis.total}
        responsesScored={analysis.scored}
      />
    </div>
  );
}
