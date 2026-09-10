"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Presentation, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDecisionData } from "@/hooks/use-decision-data";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { DrillDown, type DrillTarget } from "@/components/decision/DrillDown";
import { PDFViewerSheet, type PDFDocument } from "@/components/PDFViewerSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { STATUS_META, scaleClass, type ResponseStatus } from "@/lib/scoring";
import { formatCurrency, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ExportConfiguration {
  id: string;
  worksheet_name: string;
  supplier_id: string;
}

function Section({
  number,
  title,
  lead,
  children,
  id,
}: {
  number: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-b border-border px-4 py-5 md:px-6 presentation:min-h-screen presentation:py-10">
      <h2 id={`${id}-title`} className="flex items-baseline gap-2 text-lg font-semibold presentation:text-3xl">
        <span className="article-no presentation:text-lg">{number}</span>
        {title}
      </h2>
      {lead && <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground presentation:text-lg">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * The sponsor's reading: who leads and why, in one page, with the chain of
 * cross-references from the aggregated score down to the quoted page.
 * Read-only by construction; presentation mode enlarges one idea per screen.
 */
export function DecisionView({ rfpId }: { rfpId: string }) {
  const data = useDecisionData(rfpId);
  const isMobile = useIsMobile();
  const [target, setTarget] = useState<DrillTarget | null>(null);
  const [presentation, setPresentation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDocuments, setPdfDocuments] = useState<PDFDocument[]>([]);
  const [pdfInitial, setPdfInitial] = useState<{ documentId: string | null; page: number | null }>({ documentId: null, page: null });

  const configsQuery = useQuery<{ configurations: ExportConfiguration[] }>({
    queryKey: ["export-configurations", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/export-configurations`);
      if (!res.ok) throw new Error("Configurations d'export indisponibles.");
      return res.json();
    },
    staleTime: 60_000,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setPresentation(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePresentation = async () => {
    if (presentation) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setPresentation(false);
      return;
    }
    setPresentation(true);
    await containerRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const openDocument = useCallback(
    async (supplierId: string, documentId: string | null, page: number | null) => {
      try {
        const res = await fetch(`/api/rfps/${rfpId}/documents?supplierId=${supplierId}`);
        const body = await res.json();
        const docs: PDFDocument[] = body.documents ?? [];
        if (docs.length === 0) {
          toast.info("Aucun document déposé pour ce fournisseur.");
          return;
        }
        const targetId = documentId ?? docs[0].id;
        if (isMobile) {
          const u = await fetch(`/api/rfps/${rfpId}/documents/${targetId}/view-url`).then((r) => r.json());
          if (u.url) window.open(`${u.url}${page ? `#page=${page}` : ""}`, "_blank", "noopener");
          return;
        }
        setPdfDocuments(docs);
        setPdfInitial({ documentId: targetId, page });
        setPdfOpen(true);
      } catch {
        toast.error("Le document n'a pas pu être ouvert.");
      }
    },
    [rfpId, isMobile]
  );

  const generateExport = async () => {
    const config = configsQuery.data?.configurations?.[0];
    if (!config) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/rfps/${rfpId}/export/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: { id: config.id }, versionId: data.versionId }),
      });
      const body = await res.json();
      if (!res.ok || !body.downloadUrl) throw new Error(body.error || "Export impossible.");
      window.open(body.downloadUrl, "_blank", "noopener");
      toast.success(`Livrable généré : ${body.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  };

  const gap = useMemo(() => {
    if (!data.bestTechnical || !data.bestFinancial) return null;
    if (data.bestTechnical.id === data.bestFinancial.supplierId) return { same: true as const };
    const techOfFinancial = data.ranking.find((r) => r.id === data.bestFinancial!.supplierId);
    const finOfTechnical = data.financial.find((f) => f.supplierId === data.bestTechnical!.id);
    return {
      same: false as const,
      scoreGap:
        data.bestTechnical.score !== null && techOfFinancial?.score != null
          ? data.bestTechnical.score - techOfFinancial.score
          : null,
      tcoGap: finOfTechnical ? finOfTechnical.tco - data.bestFinancial.tco : null,
    };
  }, [data.bestTechnical, data.bestFinancial, data.ranking, data.financial]);

  if (data.isLoading) return <PageState kind="loading" title="Chargement de la synthèse" />;
  if (data.error) {
    return (
      <PageState
        kind="error"
        title="La synthèse n'a pas pu être chargée"
        description={data.error.message}
        action={<Button variant="outline" onClick={data.refetch}>Réessayer</Button>}
      />
    );
  }
  if (data.suppliers.length === 0 || data.responses.length === 0) {
    return (
      <PageState
        kind="empty"
        title="Rien à arbitrer pour l'instant"
        description="La synthèse se construit dès que des réponses sont notées."
      />
    );
  }

  const suppliers = data.ranking;
  const lead = data.bestTechnical
    ? `Mieux-disant technique : ${data.bestTechnical.name} (${formatScore(data.bestTechnical.score)}/5).${
        data.bestFinancial
          ? ` Mieux-disant financier : ${data.bestFinancial.supplierName} (TCO ${formatCurrency(data.bestFinancial.tco)}).`
          : ""
      }`
    : "Aucune note enregistrée.";

  const exportConfig = configsQuery.data?.configurations?.[0];

  return (
    <div
      ref={containerRef}
      data-presentation={presentation || undefined}
      className={cn("mx-auto max-w-6xl bg-background", presentation && "presentation max-w-none overflow-y-auto")}
    >
      <PageHeader
        number={4}
        title="Décision"
        lead={lead}
        className="no-print"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            {!isMobile && (
              <Button variant="outline" size="sm" onClick={togglePresentation} aria-pressed={presentation}>
                <Presentation className="h-4 w-4" />
                {presentation ? "Quitter" : "Présenter"}
              </Button>
            )}
            {exportConfig ? (
              <Button size="sm" onClick={generateExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exporter le livrable
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/rfp/${rfpId}/export`}>Préparer l'export</Link>
              </Button>
            )}
          </>
        }
      />

      <Section id="classement" number="4.1" title="Classement technique" lead="Moyenne pondérée des notes par exigence, sur 5. La couverture indique la part des exigences notées.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm presentation:text-lg">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground presentation:text-sm">
                <th className="w-8 py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Fournisseur</th>
                <th className="py-2 text-right font-semibold">Note</th>
                <th className="w-48 py-2 font-semibold"></th>
                <th className="py-2 text-right font-semibold">Couverture</th>
                <th className="py-2 pl-4 font-semibold">Répartition</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const pct = s.score === null ? 0 : (s.score / 5) * 100;
                const total = Object.values(s.statuses).reduce((a, b) => a + b, 0);
                return (
                  <tr key={s.id} className={cn("border-t border-border", s.rank === 1 && "font-semibold")}>
                    <td className="tnum py-2.5 text-muted-foreground">{s.rank}</td>
                    <td className="py-2.5">{s.name}</td>
                    <td className="tnum py-2.5 text-right">{formatScore(s.score)}</td>
                    <td className="py-2.5 pl-3">
                      <span className="block h-2 w-full overflow-hidden rounded-sm bg-muted" aria-hidden>
                        <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                      </span>
                    </td>
                    <td className="tnum py-2.5 text-right text-muted-foreground">{s.scored}/{s.total}</td>
                    <td className="py-2.5 pl-4">
                      <span className="flex h-2 w-40 overflow-hidden rounded-sm bg-muted" aria-label={(["pass", "partial", "fail", "roadmap"] as ResponseStatus[]).map((k) => `${STATUS_META[k].label} ${s.statuses[k]}`).join(", ")}>
                        {(["pass", "partial", "fail", "roadmap"] as ResponseStatus[]).map((k) => (
                          <span
                            key={k}
                            className={cn("block h-full", k === "pass" && "bg-status-pass", k === "partial" && "bg-status-partial", k === "fail" && "bg-status-fail", k === "roadmap" && "bg-status-roadmap")}
                            style={{ width: total ? `${(s.statuses[k] / total) * 100}%` : 0 }}
                          />
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(["pass", "partial", "fail", "roadmap"] as ResponseStatus[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={cn("inline-block h-2 w-2 rounded-sm", k === "pass" && "bg-status-pass", k === "partial" && "bg-status-partial", k === "fail" && "bg-status-fail", k === "roadmap" && "bg-status-roadmap")} />
              {STATUS_META[k].label}
            </span>
          ))}
        </p>
      </Section>

      <Section id="domaines" number="4.2" title="Notes par domaine" lead="Chaque cellule est la moyenne pondérée du domaine pour un fournisseur. Cliquez une cellule pour descendre jusqu'aux exigences et aux passages cités.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm presentation:text-lg">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground presentation:text-sm">Domaine</th>
                <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground presentation:text-sm">Poids</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="min-w-[88px] py-2 px-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground presentation:text-sm">
                    <span className="line-clamp-2">{s.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.domainRows.map((row) => {
                const node = data.tree.find((n) => n.id === row.id)!;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="sticky left-0 bg-background py-1.5 pr-3">
                      <span className="article-no mr-2">{row.code}</span>
                      <span>{row.title}</span>
                      <span className="tnum ml-2 text-xs text-muted-foreground">{row.requirementCount} exig.</span>
                    </td>
                    <td className="tnum py-1.5 pr-3 text-right text-muted-foreground">{row.weight}</td>
                    {suppliers.map((s) => {
                      const cell = row.cells[s.id];
                      return (
                        <td key={s.id} className="p-0.5">
                          <button
                            type="button"
                            onClick={() => setTarget({ domain: node, supplier: { id: s.id, name: s.name }, domainScore: cell.score })}
                            aria-label={`${row.title}, ${s.name} : ${formatScore(cell.score)} sur 5, ${cell.scored} exigences notées sur ${cell.total}`}
                            className={cn(
                              "tnum flex h-9 w-full items-center justify-center rounded-sm font-semibold transition-[outline] duration-150 hover:outline hover:outline-2 hover:outline-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring presentation:h-12",
                              scaleClass(cell.score)
                            )}
                          >
                            {formatScore(cell.score)}
                            {cell.total > 0 && cell.scored < cell.total && (
                              <span className="ml-1 text-2xs font-normal opacity-80">{cell.scored}/{cell.total}</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="financier" number="4.3" title="Technique et financier" lead="Le mieux-disant technique face au mieux-disant financier, sur le coût total de possession à 3 ans.">
        {data.financialLoading ? (
          <p className="text-sm text-muted-foreground">Chargement du volet financier</p>
        ) : !data.hasFinancial || data.financial.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Volet financier non renseigné.</span>
            <Button variant="outline" size="xs" asChild>
              <Link href={`/dashboard/rfp/${rfpId}/financial-grid`}>Ouvrir la grille financière</Link>
            </Button>
          </div>
        ) : (
          <>
            {gap && (
              <p className="mb-3 max-w-[70ch] text-sm presentation:text-xl">
                {gap.same
                  ? `${data.bestTechnical?.name} est à la fois mieux-disant technique et financier.`
                  : `${data.bestTechnical?.name} mène techniquement ; ${data.bestFinancial?.supplierName} est le moins cher${
                      gap.scoreGap !== null ? `, à ${formatScore(gap.scoreGap)} point de note` : ""
                    }${gap.tcoGap !== null ? ` pour ${formatCurrency(gap.tcoGap)} d'écart de TCO` : ""}.`}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm presentation:text-lg">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground presentation:text-sm">
                    <th className="py-2 font-semibold">Fournisseur</th>
                    <th className="py-2 text-right font-semibold">Rang technique</th>
                    <th className="py-2 text-right font-semibold">Note</th>
                    <th className="py-2 text-right font-semibold">Rang financier</th>
                    <th className="py-2 text-right font-semibold">TCO 3 ans</th>
                    <th className="py-2 text-right font-semibold">Écart TCO</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => {
                    const f = data.financial.find((x) => x.supplierId === s.id);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-2">{s.name}</td>
                        <td className="tnum py-2 text-right">{s.rank}</td>
                        <td className="tnum py-2 text-right">{formatScore(s.score)}</td>
                        <td className="tnum py-2 text-right">{f ? f.rank : "—"}</td>
                        <td className="tnum py-2 text-right">{f ? formatCurrency(f.tco) : "—"}</td>
                        <td className="tnum py-2 text-right text-muted-foreground">
                          {f && data.bestFinancial ? (f.tco === data.bestFinancial.tco ? "référence" : `+${formatCurrency(f.tco - data.bestFinancial.tco)}`) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <DrillDown
        rfpId={rfpId}
        versionId={data.versionId}
        target={target}
        onClose={() => setTarget(null)}
        responsesOf={target ? data.bySupplier.get(target.supplier.id) ?? new Map() : new Map()}
        weightOf={data.weightOf}
        onOpenDocument={openDocument}
      />

      {!isMobile && (
        <PDFViewerSheet
          isOpen={pdfOpen}
          onOpenChange={setPdfOpen}
          documents={pdfDocuments}
          rfpId={rfpId}
          initialDocumentId={pdfInitial.documentId}
          initialPage={pdfInitial.page}
        />
      )}
    </div>
  );
}
