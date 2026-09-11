"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Terminal, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { StateGlyph } from "@/components/shell/StateGlyph";
import { FormatDialog } from "@/components/import/FormatDialog";
import { usePreparation } from "@/hooks/use-preparation";
import { useRequirementsTree, type TreeNode } from "@/hooks/use-requirements";
import { useVersion } from "@/contexts/VersionContext";
import type { ChapterState } from "@/hooks/use-consultation";
import {
  DATASETS,
  buildPreview,
  keptPayloads,
  type DatasetId,
  type ImportContext,
  type Preview,
  type RowState,
} from "@/lib/import/datasets";
import { cn } from "@/lib/utils";

const DATASET_ORDER: DatasetId[] = ["domaines", "exigences", "fournisseurs", "reponses"];

const ROW_TONE: Record<RowState, string> = {
  create: "bg-status-pass",
  update: "bg-primary",
  skip: "bg-status-pending",
  error: "bg-status-fail",
};

type Filter = "all" | "write" | "error";

interface Draft {
  raw: string;
  fileName: string | null;
}

function isDataset(value: string | null): value is DatasetId {
  return value !== null && (DATASET_ORDER as string[]).includes(value);
}

/** Codes and titles already in the consultation, read once for every dataset. */
function walkTree(tree: TreeNode[]) {
  const categoryCodes: string[] = [];
  const categoryTitles: string[] = [];
  const requirementCodes: string[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.type === "category") {
        categoryCodes.push(node.code);
        categoryTitles.push(node.title);
      } else {
        requirementCodes.push(node.code);
      }
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return { categoryCodes, categoryTitles, requirementCodes };
}

function RailRow({
  label,
  figure,
  state,
  active,
  indent,
  onClick,
}: {
  label: string;
  figure: string;
  state: ChapterState;
  active: boolean;
  indent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md py-0 pr-2.5 text-left text-sm transition-colors duration-150",
        indent ? "h-8 pl-7" : "h-9 pl-2.5",
        active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <StateGlyph state={state} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="num shrink-0 text-2xs text-muted-foreground">{figure}</span>
    </button>
  );
}

/**
 * The import workspace: the dataset on the left with what it already holds,
 * its reading on the right. Nothing is written before the preview, and only
 * the rows the preview vouches for are sent.
 */
export function ImportWorkspace({ rfpId }: { rfpId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { activeVersion, isLoading: versionsLoading } = useVersion();
  const { preparation, isLoading, error, refetch } = usePreparation(
    versionsLoading ? null : rfpId,
    activeVersion?.id
  );
  const { tree, refetch: refetchTree } = useRequirementsTree(rfpId);

  const requested = params.get("dataset");
  const requestedSupplier = params.get("supplier");
  const [dataset, setDataset] = useState<DatasetId>(isDataset(requested) ? requested : "domaines");
  const [supplierId, setSupplierId] = useState<string | null>(requestedSupplier);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [filter, setFilter] = useState<Filter>("all");
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const suppliers = preparation?.suppliers.items ?? [];
  const supplier = suppliers.find((s) => s.id === supplierId || s.supplier_id_external === supplierId) ?? null;
  const draftKey = dataset === "reponses" ? `reponses:${supplier?.id ?? "none"}` : dataset;
  const draft = drafts[draftKey] ?? { raw: "", fileName: null };

  const { categoryCodes, categoryTitles, requirementCodes } = useMemo(() => walkTree(tree), [tree]);

  const context = useMemo<ImportContext>(
    () => ({
      rfpId,
      origin: typeof window === "undefined" ? "" : window.location.origin,
      categoryCodes,
      categoryTitles,
      requirementCodes,
      supplierIds: suppliers.map((s) => s.supplier_id_external).filter(Boolean),
      supplier: supplier
        ? { externalId: supplier.supplier_id_external, name: supplier.name }
        : undefined,
    }),
    [rfpId, categoryCodes, categoryTitles, requirementCodes, suppliers, supplier]
  );

  const preview: Preview | null = useMemo(
    () => (draft.raw.trim() ? buildPreview(dataset, draft.raw, context) : null),
    [draft.raw, dataset, context]
  );

  const select = useCallback(
    (next: DatasetId, nextSupplier?: string | null) => {
      setDataset(next);
      setSupplierId(nextSupplier ?? null);
      setFilter("all");
      setResult(null);
      const query = new URLSearchParams({ dataset: next });
      if (nextSupplier) query.set("supplier", nextSupplier);
      router.replace(`/dashboard/rfp/${rfpId}/import?${query.toString()}`, { scroll: false });
    },
    [router, rfpId]
  );

  const setDraft = (raw: string, fileName: string | null) => {
    setResult(null);
    setFilter("all");
    setDrafts((prev) => ({ ...prev, [draftKey]: { raw, fileName } }));
  };

  const readFile = async (file: File) => {
    if (file.size > 4_000_000) {
      toast.error("Fichier trop volumineux.", { description: "4 Mo au maximum." });
      return;
    }
    const text = await file.text();
    setDraft(text, file.name);
    setTab("file");
  };

  const runImport = async () => {
    if (!preview) return;
    const payloads = keptPayloads(preview);
    if (payloads.length === 0) return;

    setImporting(true);
    setResult(null);
    try {
      let url = "";
      let body: Record<string, unknown> = {};
      if (dataset === "domaines") {
        url = `/api/rfps/${rfpId}/categories/import`;
        body = { json: JSON.stringify(payloads) };
      } else if (dataset === "exigences") {
        url = `/api/rfps/${rfpId}/requirements/import`;
        body = { json: JSON.stringify(payloads) };
      } else if (dataset === "fournisseurs") {
        url = `/api/rfps/${rfpId}/suppliers/import`;
        body = { suppliers: payloads };
      } else {
        if (!supplier) return;
        url = `/api/rfps/${rfpId}/responses/import`;
        body = {
          responses: payloads.map((p) => ({ ...p, supplier_id_external: supplier.supplier_id_external })),
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "L'import a échoué.");

      const { create, update, skip } = preview.counts;
      const written =
        dataset === "domaines"
          ? `${create} domaine${create > 1 ? "s" : ""} créé${create > 1 ? "s" : ""}`
          : dataset === "exigences"
            ? `${create} exigence${create > 1 ? "s" : ""} créée${create > 1 ? "s" : ""}`
            : dataset === "fournisseurs"
              ? `${create} fournisseur${create > 1 ? "s" : ""} créé${create > 1 ? "s" : ""}`
              : `${create} réponse${create > 1 ? "s" : ""} déposée${create > 1 ? "s" : ""}`;
      const parts = [written];
      if (update > 0) parts.push(`${update} mise${update > 1 ? "s" : ""} à jour`);
      if (skip > 0) parts.push(`${skip} ignorée${skip > 1 ? "s" : ""}`);
      const summary = parts.join(", ") + ".";

      setResult(summary);
      setDrafts((prev) => ({ ...prev, [draftKey]: { raw: "", fileName: null } }));
      toast.success("Import terminé", { description: summary });

      queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["requirements-tree", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["all-responses", rfpId] });
      refetch();
      refetchTree();
    } catch (err) {
      toast.error("L'import a échoué.", {
        description: err instanceof Error ? err.message : "Réessayez.",
      });
    } finally {
      setImporting(false);
    }
  };

  if (isLoading || versionsLoading) {
    return <PageState kind="loading" title="Chargement des jeux de données" />;
  }
  if (error || !preparation) {
    return (
      <PageState
        kind="error"
        title="Les jeux de données n'ont pas pu être chargés"
        description={error?.message}
        action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>}
      />
    );
  }

  const readOnly = preparation.userAccessLevel === "viewer";
  const spec = DATASETS[dataset];
  const counts = preview?.counts;
  const toWrite = counts ? counts.create + counts.update : 0;
  const rows = preview
    ? preview.rows.filter((r) =>
        filter === "all" ? true : filter === "error" ? r.state === "error" : r.state === "create" || r.state === "update"
      )
    : [];

  const railState = (state: "done" | "partial" | "empty"): ChapterState => state;
  const requirementsState: ChapterState =
    preparation.specification.requirements > 0 ? "done" : "empty";
  const responsesDone = preparation.responses.suppliersWithResponses;

  const title =
    dataset === "reponses" && supplier ? `Réponses · ${supplier.name}` : spec.label;
  const lead =
    dataset === "reponses" && !supplier
      ? "Choisissez le fournisseur dont vous déposez les réponses."
      : spec.lead;

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col pb-6">
      <PageHeader
        title="Importer des données"
        lead="Le jeu de données à gauche, sa lecture à droite. Rien n'est écrit avant l'aperçu."
      />

      <div className="min-h-0 flex-1 px-4 md:px-8">
        <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-panel md:flex-row">
          {/* Jeux de données */}
          <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-rail p-2.5 md:w-[260px] md:border-b-0 md:border-r">
            <p className="px-2.5 pt-1 text-xs font-medium text-muted-foreground">Jeux de données</p>
            <div className="flex flex-col gap-0.5">
              <RailRow
                label="Domaines"
                figure={`${preparation.specification.categories} importés`}
                state={railState(preparation.specification.categories > 0 ? "done" : "empty")}
                active={dataset === "domaines"}
                onClick={() => select("domaines")}
              />
              <RailRow
                label="Exigences"
                figure={`${preparation.specification.requirements} importées`}
                state={requirementsState}
                active={dataset === "exigences"}
                onClick={() => select("exigences")}
              />
              <RailRow
                label="Fournisseurs"
                figure={`${preparation.suppliers.total} déclarés`}
                state={railState(preparation.suppliers.total > 0 ? "done" : "empty")}
                active={dataset === "fournisseurs"}
                onClick={() => select("fournisseurs")}
              />
              <RailRow
                label="Réponses"
                figure={`${responsesDone}/${preparation.suppliers.total}`}
                state={railState(
                  responsesDone === 0
                    ? "empty"
                    : responsesDone < preparation.suppliers.total
                      ? "partial"
                      : "done"
                )}
                active={dataset === "reponses" && !supplier}
                onClick={() => select("reponses")}
              />
              {suppliers.map((s) => {
                const total = preparation.responses.requirementsTotal;
                const state: ChapterState =
                  s.responsesTotal === 0 ? "empty" : s.responsesTotal >= total ? "done" : "partial";
                return (
                  <RailRow
                    key={s.id}
                    indent
                    label={s.name}
                    figure={s.responsesTotal === 0 ? "à déposer" : `${s.responsesTotal}/${total}`}
                    state={state}
                    active={dataset === "reponses" && supplier?.id === s.id}
                    onClick={() => select("reponses", s.id)}
                  />
                );
              })}
            </div>
            <div className="flex-1" />
            <div className="border-t border-border p-2.5 text-xs text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Un agent peut écrire ces mêmes jeux.
              </p>
              <Link href="/dashboard/settings/tokens" className="mt-1 block text-accent-foreground hover:underline">
                Jeton d&apos;accès et connecteur
              </Link>
            </div>
          </div>

          {/* Lecture */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-4 px-4 pt-4 md:px-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{lead}</p>
              </div>
              <FormatDialog dataset={dataset} context={context} />
            </div>

            {dataset === "reponses" && !supplier ? (
              <div className="flex flex-1 items-center justify-center px-6 py-10">
                <p className="max-w-sm text-center text-sm text-muted-foreground">
                  Les réponses se déposent fournisseur par fournisseur. Choisissez-en un dans la
                  liste, à gauche.
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 md:px-6">
                  <div className="flex items-center gap-5 border-b border-border">
                    {([["file", "Fichier"], ["paste", "Coller du JSON"]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                          "-mb-px h-9 border-b-2 text-sm transition-colors duration-150",
                          tab === key
                            ? "border-primary font-semibold text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 pt-3 md:px-6">
                  {tab === "file" ? (
                    draft.fileName ? (
                      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3.5 py-2.5">
                        <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="num truncate text-xs">{draft.fileName}</span>
                        <span className="text-sm text-muted-foreground">
                          {preview?.fatal ? "illisible" : `${preview?.counts.total ?? 0} lignes lues`}
                        </span>
                        <span className="flex-1" />
                        <Button variant="ghost" size="xs" onClick={() => fileInput.current?.click()}>
                          Remplacer
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          mode="icon"
                          aria-label="Retirer le fichier"
                          onClick={() => setDraft("", null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) void readFile(file);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border border-dashed px-4 py-5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
                          dragging ? "border-primary bg-accent/40" : "border-input bg-background hover:border-primary"
                        )}
                      >
                        <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span>
                          <span className="block text-sm font-semibold">
                            Déposer un fichier .json
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            ou cliquer pour le choisir · 4 Mo au maximum
                          </span>
                        </span>
                      </button>
                    )
                  ) : (
                    <Textarea
                      value={draft.raw}
                      onChange={(e) => setDraft(e.target.value, null)}
                      disabled={readOnly}
                      spellCheck={false}
                      placeholder='[{"code": "R-101", "title": "…"}]'
                      className="h-28 resize-none font-mono text-xs"
                      aria-label="JSON à importer"
                    />
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Aperçu */}
                <div className="min-h-0 flex-1 overflow-auto px-4 pt-3 md:px-6">
                  {result ? (
                    <div className="flex items-start gap-2.5 rounded-md border border-border bg-status-pass-soft px-3.5 py-2.5">
                      <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-status-pass" />
                      <p className="text-sm">{result}</p>
                    </div>
                  ) : preview?.fatal ? (
                    <div className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-status-fail-soft px-3.5 py-2.5">
                      <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-status-fail" />
                      <p className="text-sm">{preview.fatal}</p>
                    </div>
                  ) : preview ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 pb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Aperçu avant écriture
                        </span>
                        <span className="flex-1" />
                        {(
                          [
                            ["all", "Tout", preview.counts.total],
                            ["write", "À écrire", toWrite],
                            ["error", "Erreurs", preview.counts.error],
                          ] as const
                        ).map(([key, label, count]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={cn(
                              "inline-flex h-6.5 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors duration-150",
                              filter === key
                                ? "border-border bg-accent font-medium text-accent-foreground"
                                : "border-input text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {label}
                            <span className="num">{count}</span>
                          </button>
                        ))}
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-muted-foreground">
                            <th className="w-6 py-1 font-semibold" />
                            {spec.columns.map((c) => (
                              <th key={c} className="py-1 pr-3 font-semibold">
                                {c}
                              </th>
                            ))}
                            <th className="py-1 font-semibold">Import</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={row.line}
                              className={cn(
                                "border-t border-border",
                                row.state === "error" && "bg-status-fail-soft"
                              )}
                            >
                              <td className="py-2">
                                <span
                                  aria-hidden
                                  className={cn("inline-block h-2 w-2 rounded-full", ROW_TONE[row.state])}
                                />
                              </td>
                              {row.cells.map((cell, i) => (
                                <td
                                  key={i}
                                  className={cn(
                                    "max-w-[26ch] truncate py-2 pr-3",
                                    i === 0 ? "article-no" : i > 0 && "text-muted-foreground",
                                    i === 1 && "max-w-[38ch] text-foreground"
                                  )}
                                >
                                  {cell}
                                </td>
                              ))}
                              <td
                                className={cn(
                                  "py-2",
                                  row.state === "error" ? "text-destructive" : "text-muted-foreground"
                                )}
                              >
                                {row.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Aucune ligne dans ce filtre.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="py-6 text-sm text-muted-foreground">
                      L&apos;aperçu s&apos;affiche dès qu&apos;un fichier est lu. Rien n&apos;est écrit
                      avant.
                    </p>
                  )}
                </div>

                {/* Pied : ce qui sera écrit */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-rail px-4 py-2.5 md:px-6">
                  {counts && !preview?.fatal ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className="inline-block h-2 w-2 rounded-full bg-status-pass" />
                        <span className="num font-semibold">{counts.create}</span> à créer
                      </span>
                      {counts.update > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                          <span className="num font-semibold">{counts.update}</span> à mettre à jour
                        </span>
                      )}
                      {counts.skip > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="inline-block h-2 w-2 rounded-full bg-status-pending" />
                          <span className="num font-semibold">{counts.skip}</span> ignorée
                          {counts.skip > 1 ? "s" : ""}
                        </span>
                      )}
                      {counts.error > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                          <span className="inline-block h-2 w-2 rounded-full bg-status-fail" />
                          <span className="num font-semibold">{counts.error}</span> en erreur
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {spec.duplicate === "update"
                        ? "Une ligne déjà présente est mise à jour."
                        : "Une ligne déjà présente est ignorée."}
                    </span>
                  )}
                  <span className="flex-1" />
                  {counts && counts.error > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Les lignes en erreur ne sont pas envoyées.
                    </span>
                  )}
                  <Button onClick={runImport} disabled={readOnly || importing || toWrite === 0}>
                    {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {toWrite > 0 ? `Importer ${toWrite} ligne${toWrite > 1 ? "s" : ""}` : "Importer"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
