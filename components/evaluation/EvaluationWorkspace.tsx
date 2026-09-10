"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FileText,
  MessageSquare,
  ListFilter,
  WifiOff,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { useRequirementsTree, useRequirement } from "@/hooks/use-requirements";
import { useResponsesLight, responsesLightKey, type ResponseLight } from "@/hooks/use-responses-light";
import { useResponses, type ResponseWithSupplier } from "@/hooks/use-responses";
import { useResponseMutation } from "@/hooks/use-response-mutation";
import { usePeerReviewStatuses, usePeerReviewMutation } from "@/hooks/use-peer-review";
import { useResponseThreads } from "@/hooks/use-response-threads";
import { useRequirementAnnotations } from "@/components/pdf/hooks/useRequirementAnnotations";
import { useRequirementDocument } from "@/hooks/use-requirement-document";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineQueueStatus } from "@/hooks/use-offline-sync";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEvaluationQueue } from "@/hooks/use-evaluation-queue";
import { WorkQueue } from "@/components/evaluation/WorkQueue";
import { ResponseColumn } from "@/components/evaluation/ResponseColumn";
import { PageState } from "@/components/shell/PageState";
import { PeerReviewBadge } from "@/components/PeerReviewBadge";
import { PeerReviewActionButton } from "@/components/PeerReviewActionButton";
import { ThreadPanel, type ThreadPanelContext } from "@/components/response-threads/ThreadPanel";
import { PDFViewerSheet, type PDFDocument } from "@/components/PDFViewerSheet";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { deriveStatus, finalScore, type ResponseStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (TEXT_TAGS.has(el.tagName) || el.isContentEditable);
}

/**
 * The evaluation workspace: the expert's work queue on the left, the
 * selected requirement and its supplier answers side by side on the right.
 * Score in one click, status follows, proof one click away, next with →.
 * On mobile the queue is the screen and a requirement opens over it with
 * answers stacked; ← → swipe between requirements.
 */
export function EvaluationWorkspace({ rfpId }: { rfpId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const { pendingCount } = useOfflineQueueStatus();
  const { user } = useAuth();
  const { activeVersion } = useVersion();
  const versionId = activeVersion?.id;
  const { preparation, access, isLoading: consultationLoading, error: consultationError } = useConsultation(rfpId);
  const canEdit = access === "owner" || access === "evaluator" || access === "admin";
  const peerReviewEnabled = !!preparation?.rfp.peer_review_enabled;

  const { tree, isLoading: treeLoading, error: treeError } = useRequirementsTree(rfpId);
  const lightQuery = useResponsesLight(rfpId, versionId);
  const lightResponses = lightQuery.data?.responses ?? [];
  const { threads } = useResponseThreads(rfpId);
  const { statuses: reviewStatuses } = usePeerReviewStatuses(peerReviewEnabled ? rfpId : undefined, versionId);

  // Threads: per response and per requirement (through the light responses).
  const threadStatsByResponse = useMemo(() => {
    const map = new Map<string, { total: number; open: number; hasBlocking: boolean }>();
    for (const t of threads) {
      const e = map.get(t.response_id) ?? { total: 0, open: 0, hasBlocking: false };
      e.total++;
      if (t.status === "open") {
        e.open++;
        if (t.priority === "blocking") e.hasBlocking = true;
      }
      map.set(t.response_id, e);
    }
    return map;
  }, [threads]);
  const openThreadRequirementIds = useMemo(() => {
    const byResponse = new Map<string, string>();
    for (const r of lightResponses) byResponse.set(r.id, r.requirement_id);
    const set = new Set<string>();
    threadStatsByResponse.forEach((v, responseId) => {
      if (v.open > 0) {
        const req = byResponse.get(responseId);
        if (req) set.add(req);
      }
    });
    return set;
  }, [threadStatsByResponse, lightResponses]);

  const queue = useEvaluationQueue(rfpId, tree, lightResponses, openThreadRequirementIds);

  // Selection: URL is the source of truth so a requirement can be shared.
  const selectedId = searchParams.get("requirementId");
  const setSelectedId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("requirementId", id);
      else params.delete("requirementId");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // A supplier deep link (?supplierId=) narrows the queue to that supplier.
  const supplierParam = searchParams.get("supplierId");
  useEffect(() => {
    if (supplierParam && queue.filters.supplierId !== supplierParam) {
      queue.setFilters({ supplierId: supplierParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierParam]);

  // Desktop opens on the first item of the queue when nothing is selected.
  useEffect(() => {
    if (isMobile || selectedId || queue.visible.length === 0 || !lightQuery.data) return;
    setSelectedId(queue.visible[0].id);
  }, [isMobile, selectedId, queue.visible, setSelectedId, lightQuery.data]);

  const position = useMemo(() => {
    const idx = queue.visible.findIndex((it) => it.id === selectedId);
    return { index: idx, total: queue.visible.length };
  }, [queue.visible, selectedId]);

  const goTo = useCallback(
    (delta: number) => {
      if (position.index < 0) return;
      const next = queue.visible[position.index + delta];
      if (next) setSelectedId(next.id);
    },
    [position.index, queue.visible, setSelectedId]
  );

  // Prefetch the next requirement's answers so → feels immediate.
  useEffect(() => {
    const next = queue.visible[position.index + 1];
    if (!next) return;
    queryClient.prefetchQuery({
      queryKey: ["responses", rfpId, next.id, versionId] as const,
      queryFn: async () => {
        const params = new URLSearchParams({ requirementId: next.id });
        if (versionId) params.set("versionId", versionId);
        const res = await fetch(`/api/rfps/${rfpId}/responses?${params}`);
        if (!res.ok) throw new Error("prefetch failed");
        return res.json();
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queue.visible, position.index, rfpId, versionId, queryClient]);

  // Keyboard: ← → between requirements, 0–5 scores the focused column.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        goTo(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo]);

  // Swipe on mobile.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (isTyping(e.target)) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) goTo(dx < 0 ? 1 : -1);
  };

  // Selected requirement: its answers, its detail, its proofs.
  const responsesQuery = useResponses(rfpId, selectedId ?? undefined, versionId, { enabled: !!selectedId });
  const responses: ResponseWithSupplier[] = useMemo(() => {
    const list = responsesQuery.data?.responses ?? [];
    return queue.filters.supplierId ? list.filter((r) => r.supplier_id === queue.filters.supplierId) : list;
  }, [responsesQuery.data, queue.filters.supplierId]);
  const { requirement: detail } = useRequirement(selectedId);
  const { annotations } = useRequirementAnnotations(selectedId ?? "");
  const bookmarksBySupplier = useMemo(() => {
    const map = new Map<string, PDFAnnotation[]>();
    for (const a of annotations ?? []) {
      if (!a.supplierId) continue;
      const list = map.get(a.supplierId) ?? [];
      list.push(a);
      map.set(a.supplierId, list);
    }
    return map;
  }, [annotations]);
  const selectedItem = queue.items.find((it) => it.id === selectedId) ?? null;
  const supplierNames = useMemo(() => responses.map((r) => r.supplier.name), [responses]);

  // Writes: one PUT per gesture, optimistic, queued offline.
  const mutation = useResponseMutation();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const write = useCallback(
    (responseId: string, patch: Parameters<typeof mutation.mutate>[0] extends infer T ? Omit<T, "responseId"> : never) => {
      setSavingIds((s) => new Set(s).add(responseId));
      mutation.mutate(
        { responseId, ...patch },
        {
          onSettled: () => {
            setSavingIds((s) => {
              const n = new Set(s);
              n.delete(responseId);
              return n;
            });
            // Keep the light list (queue counts) in step.
            queryClient.setQueryData(responsesLightKey(rfpId, versionId), (old: { responses: ResponseLight[]; meta: unknown } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                responses: old.responses.map((r) =>
                  r.id === responseId
                    ? {
                        ...r,
                        ...(patch.manual_score !== undefined ? { manual_score: patch.manual_score } : {}),
                        ...(patch.status !== undefined ? { status: patch.status } : {}),
                        ...(patch.is_checked !== undefined ? { is_checked: patch.is_checked } : {}),
                        ...(patch.manual_comment !== undefined ? { has_manual_comment: !!patch.manual_comment?.trim() } : {}),
                        ...(patch.question !== undefined ? { has_question: !!patch.question?.trim() } : {}),
                      }
                    : r
                ),
              };
            });
          },
        }
      );
    },
    [mutation, queryClient, rfpId, versionId]
  );

  // Peer review: when every answer is checked, submit (or approve for owners).
  const reviewMutation = usePeerReviewMutation({ rfpId, versionId: versionId ?? "" });
  const autoReviewed = useRef<string | null>(null);
  useEffect(() => {
    if (!peerReviewEnabled || !versionId || !selectedId || responses.length === 0) return;
    const all = responses.every((r) => r.is_checked);
    const current = reviewStatuses.get(selectedId)?.status ?? "draft";
    if (all && current === "draft" && autoReviewed.current !== selectedId) {
      autoReviewed.current = selectedId;
      reviewMutation.mutate({
        requirementId: selectedId,
        status: access === "owner" || access === "admin" ? "approved" : "submitted",
        version_id: versionId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, peerReviewEnabled, versionId, selectedId, reviewStatuses, access]);

  // Proof: the PDF sheet on desktop, a new tab on mobile.
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDocuments, setPdfDocuments] = useState<PDFDocument[]>([]);
  const [pdfInitial, setPdfInitial] = useState<{ documentId: string | null; page: number | null }>({ documentId: null, page: null });
  const { availableDocuments, loadDocuments } = useRequirementDocument(rfpId, { autoFetch: false });

  const openInSheetOrTab = useCallback(
    async (documents: PDFDocument[], documentId: string | null, page: number | null) => {
      if (isMobile) {
        const target = documentId ?? documents[0]?.id;
        if (!target) return;
        try {
          const res = await fetch(`/api/rfps/${rfpId}/documents/${target}/view-url`);
          const data = await res.json();
          if (data.url) window.open(`${data.url}${page ? `#page=${page}` : ""}`, "_blank", "noopener");
        } catch {
          toast.error("Le document n'a pas pu être ouvert.");
        }
        return;
      }
      setPdfDocuments(documents);
      setPdfInitial({ documentId, page });
      setPdfOpen(true);
    },
    [isMobile, rfpId]
  );

  const openSupplierDocuments = useCallback(
    async (supplierId: string, documentId: string | null = null, page: number | null = null) => {
      try {
        const res = await fetch(`/api/rfps/${rfpId}/documents?supplierId=${supplierId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const docs: PDFDocument[] = data.documents ?? [];
        if (docs.length === 0) {
          toast.info("Ce fournisseur n'a pas de document déposé.");
          return;
        }
        await openInSheetOrTab(docs, documentId, page);
      } catch {
        toast.error("Les documents du fournisseur n'ont pas pu être chargés.");
      }
    },
    [rfpId, openInSheetOrTab]
  );

  const openContextPdf = useCallback(async () => {
    if (!detail) return;
    const docs = availableDocuments.length > 0 ? availableDocuments : await loadDocuments();
    const target = detail.rf_document_id ?? docs[0]?.id ?? null;
    if (!target) {
      toast.info("Aucun cahier des charges PDF déposé.");
      return;
    }
    const page = (detail.position_in_pdf as { page_number?: number } | null)?.page_number ?? null;
    await openInSheetOrTab(docs as PDFDocument[], target, page);
  }, [detail, availableDocuments, loadDocuments, openInSheetOrTab]);

  // Discussions.
  const [threadPanel, setThreadPanel] = useState<{ open: boolean; context: ThreadPanelContext }>({ open: false, context: { globalView: true } });
  const openThreadsFor = (r: ResponseWithSupplier) =>
    setThreadPanel({ open: true, context: { responseId: r.id, supplierName: r.supplier.name, requirementTitle: selectedItem?.title ?? "" } });

  // Mobile queue sheet on desktop is not needed; on mobile the queue is the page.
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);

  if (consultationError || treeError) {
    return (
      <PageState
        kind="error"
        title="L'évaluation n'a pas pu être ouverte"
        description={((consultationError ?? treeError) as Error | null)?.message}
      />
    );
  }
  if (consultationLoading || treeLoading || lightQuery.isLoading) {
    return <PageState kind="loading" title="Chargement de la file de travail" />;
  }
  if (lightQuery.error) {
    return (
      <PageState
        kind="error"
        title="Les réponses n'ont pas pu être chargées"
        description={lightQuery.error.message}
        action={<Button variant="outline" onClick={() => lightQuery.refetch()}>Réessayer</Button>}
      />
    );
  }
  if (queue.items.length === 0) {
    return (
      <PageState
        kind="empty"
        title="Aucune exigence à évaluer"
        description="Le référentiel est vide ou aucune réponse n'a été déposée."
      />
    );
  }

  const suppliers = (preparation?.suppliers.items ?? []).map((s) => ({ id: s.id, name: s.name }));
  const reviewStatus = selectedId ? reviewStatuses.get(selectedId)?.status ?? "draft" : "draft";

  const connectivity = !isOnline ? (
    <span className="inline-flex items-center gap-1 text-xs text-status-partial" role="status">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne{pendingCount > 0 ? ` · ${pendingCount} en attente` : ""}
    </span>
  ) : pendingCount > 0 ? (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
      <UploadCloud className="h-3.5 w-3.5" />
      Envoi de {pendingCount} saisies
    </span>
  ) : null;

  const requirementPane = selectedId && selectedItem ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="border-b border-border px-3 py-2 md:px-4">
        <div className="flex items-start gap-2">
          {isMobile && (
            <Button variant="ghost" size="sm" mode="icon" aria-label="Retour à la file" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="article-no">{selectedItem.code}</span>
              <span className="truncate">{selectedItem.path}</span>
              {selectedItem.isMandatory && <span className="stamp stamp-pending">Obligatoire</span>}
              {peerReviewEnabled && <PeerReviewBadge status={reviewStatus} size="sm" />}
            </p>
            <h2 className="mt-0.5 text-base font-semibold leading-5 md:text-lg md:leading-6">{selectedItem.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {connectivity}
            {peerReviewEnabled && versionId && (
              <PeerReviewActionButton requirementId={selectedId} rfpId={rfpId} versionId={versionId} status={reviewStatus} userAccessLevel={access} />
            )}
            {!isMobile && (
              <>
                <Button variant="ghost" size="sm" mode="icon" aria-label="Exigence précédente" disabled={position.index <= 0} onClick={() => goTo(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="tnum text-xs text-muted-foreground">{position.index + 1}/{position.total}</span>
                <Button variant="ghost" size="sm" mode="icon" aria-label="Exigence suivante" disabled={position.index >= position.total - 1} onClick={() => goTo(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {(detail?.description || detail?.context) && (
          <details className="mt-1.5 text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Détail de l'exigence
            </summary>
            {detail?.description && <p className="mt-1 max-w-[75ch] whitespace-pre-wrap text-foreground">{detail.description}</p>}
            {detail?.context && (
              <div className="mt-2">
                <p className="max-w-[75ch] whitespace-pre-wrap text-muted-foreground">{detail.context}</p>
                <button type="button" onClick={openContextPdf} className="mt-1 inline-flex items-center gap-1 text-xs text-accent-foreground hover:underline underline-offset-2">
                  <FileText className="h-3 w-3" />
                  Ouvrir dans le cahier des charges
                  {(detail.position_in_pdf as { page_number?: number } | null)?.page_number ? ` (p. ${(detail.position_in_pdf as { page_number?: number }).page_number})` : ""}
                </button>
              </div>
            )}
          </details>
        )}
      </header>

      {responsesQuery.isLoading ? (
        <PageState kind="loading" title="Chargement des réponses" />
      ) : responses.length === 0 ? (
        <PageState kind="empty" title="Aucune réponse pour cette exigence" />
      ) : (
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-auto",
            !isMobile && "grid auto-cols-[minmax(300px,1fr)] grid-flow-col"
          )}
        >
          {responses.map((r) => {
            const bookmarks = bookmarksBySupplier.get(r.supplier_id) ?? [];
            return (
              <ResponseColumn
                key={r.id}
                rfpId={rfpId}
                response={r}
                requirement={{ id: selectedId, title: selectedItem.title, description: detail?.description ?? "" }}
                supplierNames={supplierNames}
                access={access}
                canEdit={canEdit}
                bookmarks={bookmarks}
                threadStats={threadStatsByResponse.get(r.id) ?? { total: 0, open: 0, hasBlocking: false }}
                isSaving={savingIds.has(r.id)}
                layout={isMobile ? "card" : "column"}
                onScore={(score) => write(r.id, { manual_score: score, status: r.status === "roadmap" ? "roadmap" : deriveStatus(score), is_checked: true })}
                onResetScore={() => write(r.id, { manual_score: null, status: r.status === "roadmap" ? "roadmap" : deriveStatus(r.ai_score) })}
                onConfirm={() => write(r.id, { is_checked: true, status: r.status === "pending" ? deriveStatus(finalScore(r)) : r.status })}
                onUncheck={() => write(r.id, { is_checked: false })}
                onStatus={(status: ResponseStatus) => write(r.id, { status, is_checked: true })}
                onComment={(text) => write(r.id, { manual_comment: text })}
                onQuestion={(text) => write(r.id, { question: text })}
                onOpenDocuments={(supplierId) => openSupplierDocuments(supplierId)}
                onOpenBookmark={(b) => b.supplierId && openSupplierDocuments(b.supplierId, b.documentId, b.pageNumber)}
                onOpenThreads={() => openThreadsFor(r)}
              />
            );
          })}
        </div>
      )}

      {isMobile && (
        <nav className="flex items-center justify-between border-t border-border bg-background px-2 py-1.5" aria-label="Navigation entre exigences">
          <Button variant="outline" size="sm" disabled={position.index <= 0} onClick={() => goTo(-1)}>
            <ChevronLeft className="h-4 w-4" /> Précédente
          </Button>
          <span className="tnum text-xs text-muted-foreground">{position.index + 1}/{position.total}</span>
          <Button variant="outline" size="sm" disabled={position.index >= position.total - 1} onClick={() => goTo(1)}>
            Suivante <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  ) : (
    <PageState kind="empty" title="Choisissez une exigence dans la file" />
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] min-w-0 flex-col overflow-hidden">
      {/* Barre d'outils du chapitre */}
      <div className="flex h-9 items-center gap-2 border-b border-border px-3 md:px-4">
        {isMobile ? (
          <Button variant="ghost" size="sm" className="gap-1 px-1" onClick={() => router.push(`/dashboard/rfp/${rfpId}`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold">Évaluation</span>
          </Button>
        ) : (
          <h1 className="flex items-baseline gap-2 text-sm font-semibold">
            <span className="article-no">3</span> Évaluation
          </h1>
        )}
        <span className="tnum text-xs text-muted-foreground">
          {queue.counts.done}/{queue.counts.all} exigences évaluées
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!isMobile && connectivity}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setThreadPanel({ open: true, context: { globalView: true } })}
            aria-label="Toutes les discussions"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Discussions</span>
          </Button>
          {isMobile && selectedId && (
            <Button variant="ghost" size="sm" mode="icon" aria-label="File de travail" onClick={() => setMobileQueueOpen(true)}>
              <ListFilter className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        {isMobile ? (
          selectedId ? (
            <>
              {requirementPane}
              <Sheet open={mobileQueueOpen} onOpenChange={setMobileQueueOpen}>
                <SheetContent side="left" className="w-[88vw] p-0">
                  <SheetTitle className="sr-only">File de travail</SheetTitle>
                  <WorkQueue
                    queue={queue}
                    suppliers={suppliers}
                    selectedId={selectedId}
                    onSelect={(id) => { setSelectedId(id); setMobileQueueOpen(false); }}
                    reviewStatusOf={(id) => reviewStatuses.get(id)?.status ?? null}
                    openThreadIds={openThreadRequirementIds}
                  />
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <WorkQueue
              queue={queue}
              suppliers={suppliers}
              selectedId={null}
              onSelect={setSelectedId}
              reviewStatusOf={(id) => reviewStatuses.get(id)?.status ?? null}
              openThreadIds={openThreadRequirementIds}
              className="flex-1"
            />
          )
        ) : (
          <>
            <aside className="w-[300px] shrink-0 border-r border-border">
              <WorkQueue
                queue={queue}
                suppliers={suppliers}
                selectedId={selectedId}
                onSelect={setSelectedId}
                reviewStatusOf={(id) => reviewStatuses.get(id)?.status ?? null}
                openThreadIds={openThreadRequirementIds}
              />
            </aside>
            {requirementPane}
          </>
        )}
      </div>

      {user && (
        <ThreadPanel
          isOpen={threadPanel.open}
          onOpenChange={(open) => setThreadPanel((s) => ({ ...s, open }))}
          rfpId={rfpId}
          context={threadPanel.context}
          currentUserId={user.id}
          onNavigateToThread={(requirementId) => {
            setSelectedId(requirementId);
            setThreadPanel((s) => ({ ...s, open: false }));
          }}
        />
      )}

      {!isMobile && (
        <PDFViewerSheet
          isOpen={pdfOpen}
          onOpenChange={setPdfOpen}
          documents={pdfDocuments}
          rfpId={rfpId}
          requirementId={selectedId ?? undefined}
          requirements={queue.items.map((it) => ({ id: it.id, title: it.title, requirement_id_external: it.code }))}
          initialDocumentId={pdfInitial.documentId}
          initialPage={pdfInitial.page}
        />
      )}
    </div>
  );
}
