"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, Bookmark, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useResponses } from "@/hooks/use-responses";
import { useRequirementAnnotations } from "@/components/pdf/hooks/useRequirementAnnotations";
import type { TreeNode } from "@/hooks/use-requirements";
import type { ResponseLight } from "@/hooks/use-responses-light";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { StatusStamp } from "@/components/evaluation/StatusStamp";
import { finalScore, scaleClass } from "@/lib/scoring";
import { formatScore } from "@/lib/format";
import { leafIdsOf } from "@/hooks/use-decision-data";
import { cn } from "@/lib/utils";

export interface DrillTarget {
  domain: TreeNode;
  supplier: { id: string; name: string };
  domainScore: number | null;
}

interface DrillDownProps {
  rfpId: string;
  versionId?: string;
  target: DrillTarget | null;
  onClose: () => void;
  responsesOf: Map<string, ResponseLight>;
  weightOf: (id: string) => number;
  onOpenDocument: (supplierId: string, documentId: string | null, page: number | null) => void;
}

function collectLeaves(node: TreeNode, acc: Array<{ node: TreeNode; path: string }>, path: string[]) {
  if (node.type === "requirement" && (!node.children || node.children.length === 0)) {
    acc.push({ node, path: path.join(" › ") });
    return;
  }
  for (const c of node.children ?? []) collectLeaves(c, acc, node.type === "category" && node.level > 1 ? [...path, node.code] : path);
}

/**
 * The chain of cross-references: domain score › requirement › supplier's
 * answer › quoted page. Nothing here edits; everything here links down.
 */
export function DrillDown({ rfpId, versionId, target, onClose, responsesOf, weightOf, onOpenDocument }: DrillDownProps) {
  const [requirementId, setRequirementId] = useState<string | null>(null);

  const leaves = useMemo(() => {
    if (!target) return [];
    const acc: Array<{ node: TreeNode; path: string }> = [];
    collectLeaves(target.domain, acc, []);
    return acc;
  }, [target]);

  const selected = leaves.find((l) => l.node.id === requirementId) ?? null;
  const responsesQuery = useResponses(rfpId, requirementId ?? undefined, versionId, { enabled: !!requirementId });
  const response = responsesQuery.data?.responses.find((r) => r.supplier_id === target?.supplier.id) ?? null;
  const { annotations } = useRequirementAnnotations(requirementId ?? "");
  const bookmarks = (annotations ?? []).filter((a: PDFAnnotation) => a.supplierId === target?.supplier.id);

  const open = !!target;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRequirementId(null);
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetTitle className="sr-only">Détail</SheetTitle>
        {target && (
          <>
            <header className="border-b border-border px-4 py-3 pr-10">
              <nav aria-label="Renvois" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span>{target.supplier.name}</span>
                <ChevronRight className="h-3 w-3" />
                <button
                  type="button"
                  onClick={() => setRequirementId(null)}
                  className={cn("hover:text-foreground", !selected && "text-foreground")}
                >
                  <span className="article-no mr-1">{target.domain.code}</span>
                  {target.domain.title}
                </button>
                {selected && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground">
                      <span className="article-no mr-1">{selected.node.code}</span>
                      {selected.node.title}
                    </span>
                  </>
                )}
              </nav>
              <div className="mt-1 flex items-center gap-3">
                {selected ? (
                  <Button variant="ghost" size="xs" className="-ml-2 gap-1" onClick={() => setRequirementId(null)}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Domaine
                  </Button>
                ) : (
                  <h2 className="text-base font-semibold">
                    {target.domain.title}
                    <span className="tnum ml-2 text-muted-foreground">{formatScore(target.domainScore)}/5</span>
                  </h2>
                )}
              </div>
            </header>

            {!selected ? (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Exigence</th>
                      <th className="px-2 py-2 text-right font-semibold">Poids</th>
                      <th className="px-2 py-2 text-right font-semibold">Note</th>
                      <th className="px-4 py-2 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(({ node }) => {
                      const r = responsesOf.get(node.id);
                      const s = r ? finalScore(r) : null;
                      return (
                        <tr
                          key={node.id}
                          className="cursor-pointer border-t border-border transition-colors duration-150 hover:bg-accent/40"
                          onClick={() => setRequirementId(node.id)}
                        >
                          <td className="px-4 py-2">
                            <span className="article-no mr-2">{node.code}</span>
                            <span className="text-accent-foreground underline-offset-2 hover:underline">{node.title}</span>
                          </td>
                          <td className="tnum px-2 py-2 text-right text-muted-foreground">{weightOf(node.id)}</td>
                          <td className="px-2 py-2 text-right">
                            <span className={cn("tnum inline-block min-w-[36px] rounded-sm px-1 text-center font-semibold", scaleClass(s))}>
                              {formatScore(s)}
                            </span>
                          </td>
                          <td className="px-4 py-2">{r ? <StatusStamp status={r.status} /> : <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {leaves.every((l) => {
                  const r = responsesOf.get(l.node.id);
                  return !r;
                }) && <p className="px-4 py-6 text-sm text-muted-foreground">Aucune réponse de ce fournisseur sur ce domaine.</p>}
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {selected.node.description && (
                  <p className="max-w-[70ch] text-sm text-muted-foreground">{selected.node.description}</p>
                )}
                {responsesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement de la réponse</p>
                ) : !response ? (
                  <p className="text-sm text-muted-foreground">Aucune réponse de {target.supplier.name}.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-2xl font-semibold">
                        {formatScore(finalScore(response))}<span className="text-sm font-normal text-muted-foreground">/5</span>
                      </span>
                      <StatusStamp status={response.status} />
                      <span className="text-xs text-muted-foreground">
                        {response.manual_score !== null ? "note de l'expert" : "note IA"}
                        {response.ai_score !== null && response.manual_score !== null ? ` · IA ${formatScore(response.ai_score)}` : ""}
                      </span>
                    </div>
                    <section>
                      <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Réponse du fournisseur</h3>
                      <p className="whitespace-pre-wrap text-sm">{response.response_text?.trim() || "Aucune réponse fournie."}</p>
                    </section>
                    {response.ai_comment && (
                      <section>
                        <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Analyse IA</h3>
                        <p className="whitespace-pre-wrap text-sm">{response.ai_comment}</p>
                      </section>
                    )}
                    {response.manual_comment && (
                      <section>
                        <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Commentaire de l'expert</h3>
                        <p className="whitespace-pre-wrap text-sm">{response.manual_comment}</p>
                      </section>
                    )}
                    <section>
                      <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Preuve dans le document</h3>
                      {bookmarks.length === 0 ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>Aucun passage cité.</span>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={response.supplier.has_documents === false}
                            title={response.supplier.has_documents === false ? "Ce fournisseur n'a déposé aucun document" : undefined}
                            onClick={() => onOpenDocument(target.supplier.id, null, null)}
                          >
                            <FileText className="h-3.5 w-3.5" /> Ouvrir les documents du fournisseur
                          </Button>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {bookmarks.map((b: PDFAnnotation & { documentName?: string }) => (
                            <li key={b.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!b.supplierId) return toast.info("Signet sans fournisseur.");
                                  onOpenDocument(b.supplierId, b.documentId, b.pageNumber);
                                }}
                                className="flex w-full items-start gap-1.5 text-left text-sm text-accent-foreground hover:underline underline-offset-2"
                              >
                                <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                  <span className="font-medium">{b.documentName ?? "Document"} · p. {b.pageNumber}</span>
                                  {b.highlightedText && <span className="block text-muted-foreground">« {b.highlightedText} »</span>}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export { leafIdsOf };
