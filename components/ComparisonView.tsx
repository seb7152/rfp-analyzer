"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierResponseCard } from "@/components/SupplierResponseCard";
import { MobileSupplierCard } from "@/components/MobileSupplierCard";
import { PDFViewerSheet } from "@/components/PDFViewerSheet";
import type { PDFDocument } from "@/components/PDFViewerSheet";
import {
  useCategoryRequirements,
  useRequirementsTree,
} from "@/hooks/use-requirements";
import { useResponses, type ResponseWithSupplier } from "@/hooks/use-responses";
import { useResponseMutation } from "@/hooks/use-response-mutation";
import { useRequirementDocument } from "@/hooks/use-requirement-document";
import type { TreeNode } from "@/hooks/use-requirements";
import type { Requirement } from "@/lib/supabase/types";
import { getRequirementById } from "@/lib/fake-data";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { useVersion } from "@/contexts/VersionContext";
import { PeerReviewBadge } from "@/components/PeerReviewBadge";
import { PeerReviewActionButton } from "@/components/PeerReviewActionButton";
import { usePeerReviewMutation } from "@/hooks/use-peer-review";
import type { RequirementReviewStatus } from "@/types/peer-review";

interface ComparisonViewProps {
  selectedRequirementId: string;
  allRequirements: Requirement[];
  onRequirementChange: (id: string) => void;
  rfpId?: string;
  supplierId?: string;
  responses?: ResponseWithSupplier[];
  isMobile?: boolean;
  userAccessLevel?: "owner" | "evaluator" | "viewer" | "admin";
  peerReviewEnabled?: boolean;
  reviewStatuses?: Map<string, RequirementReviewStatus>;
  onOpenThreadPanel?: (responseId: string, supplierName: string, requirementTitle: string) => void;
  threadStatsByResponseId?: Map<string, { total: number; open: number; hasBlocking: boolean }>;
}

interface ResponseState {
  [responseId: string]: {
    expanded: boolean;
    manualScore: number | undefined;
    status: "pass" | "partial" | "fail" | "pending" | "roadmap";
    isChecked: boolean;
    manualComment: string;
    question: string;
    isSaving: boolean;
    showSaved: boolean;
    // Track which fields are currently being edited (dirty)
    dirtyFields: Set<"manualComment" | "question">;
  };
}

type DesktopCardProps = React.ComponentProps<typeof SupplierResponseCard>;
type MobileCardProps = React.ComponentProps<typeof MobileSupplierCard>;

const MemoizedSupplierResponseCard = React.memo((props: DesktopCardProps) => (
  <SupplierResponseCard {...props} />
));

const MemoizedMobileSupplierCard = React.memo((props: MobileCardProps) => (
  <MobileSupplierCard {...props} />
));

const getInitialStateFromResponse = (
  response: ResponseWithSupplier
): ResponseState[string] => {
  const statusValue = response.status || "pending";

  return {
    expanded: false,
    manualScore: response.manual_score ?? undefined,
    status: statusValue as "pass" | "partial" | "fail" | "pending" | "roadmap",
    isChecked: response.is_checked || false,
    manualComment: response.manual_comment || "",
    question: response.question || "",
    isSaving: false,
    showSaved: false,
    dirtyFields: new Set(),
  };
};

export function ComparisonView({
  selectedRequirementId,
  allRequirements,
  onRequirementChange,
  rfpId,
  supplierId,
  responses: preloadedResponses,
  isMobile = false,
  userAccessLevel,
  peerReviewEnabled = false,
  reviewStatuses,
  onOpenThreadPanel,
  threadStatsByResponseId,
}: ComparisonViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [supplierDocuments, setSupplierDocuments] = useState<PDFDocument[]>([]);
  const [loadingSupplierDocs, setLoadingSupplierDocs] = useState(false);
  const [initialPdfState, setInitialPdfState] = useState<{
    documentId: string | null;
    page: number | null;
  }>({ documentId: null, page: null });

  // Initialize mutation hook for persisting changes
  const mutation = useResponseMutation();

  // Get version context to filter removed suppliers
  const { activeVersion } = useVersion();

  // Peer review auto-trigger mutation
  const peerReviewMutation = usePeerReviewMutation({
    rfpId: rfpId ?? "",
    versionId: activeVersion?.id ?? "",
  });

  // Ref to detect false → true transition of allResponsesChecked without re-triggering on navigation
  const autoReviewStateRef = useRef<{
    requirementId: string | null;
    prevAllChecked: boolean;
  }>({ requirementId: null, prevAllChecked: false });

  // Timers for hiding "Saved" indicator
  const savedTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Touch/Swipe tracking for mobile navigation
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  const SWIPE_THRESHOLD = 50; // Minimum pixels for a swipe to register
  const SWIPE_RATIO_THRESHOLD = 2; // Min ratio of horizontal to vertical movement

  // Fetch the tree to determine if selected item is a category
  const { tree } = useRequirementsTree(rfpId || null);

  // Fetch available cahier_charges documents for PDF opening (deferred)
  const { availableDocuments, loadDocuments } = useRequirementDocument(
    rfpId || null,
    { autoFetch: false }
  );

  useEffect(() => {
    if (!rfpId) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let idleCallbackId: number | null = null;

    const loadDeferredDocuments = () => {
      loadDocuments().catch((error) =>
        console.error("[ComparisonView] Failed to load documents lazily", error)
      );
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackId = (window as any).requestIdleCallback(
        loadDeferredDocuments
      );
    } else {
      timeoutId = setTimeout(loadDeferredDocuments, 500);
    }

    return () => {
      if (
        typeof window !== "undefined" &&
        idleCallbackId !== null &&
        "cancelIdleCallback" in window
      ) {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadDocuments, rfpId]);

  // Get the selected requirement object
  const selectedRequirement = useMemo(() => {
    return allRequirements.find((r) => r.id === selectedRequirementId) || null;
  }, [allRequirements, selectedRequirementId]);

  const shouldFetchResponses = !preloadedResponses;

  // Fetch responses for the selected requirement (only if not preloaded)
  const { data: responsesData, refetch: refetchResponses } = useResponses(
    rfpId || "",
    selectedRequirementId,
    activeVersion?.id,
    { enabled: shouldFetchResponses }
  );

  // Fetch annotations for the selected requirement
  // Now handled by individual SupplierResponseCard components
  // const {
  //   annotations: requirementAnnotations,
  //   deleteAnnotation,
  // } = useRequirementAnnotations(selectedRequirementId);

  const responses: ResponseWithSupplier[] = useMemo(() => {
    if (preloadedResponses) {
      return preloadedResponses.filter(
        (response) => response.requirement_id === selectedRequirementId
      );
    }
    return ((responsesData as any)?.responses || []) as ResponseWithSupplier[];
  }, [preloadedResponses, responsesData, selectedRequirementId]);
  const suppliers = useMemo(() => {
    // Extract unique suppliers from responses
    const supplierMap = new Map();
    responses.forEach((response: any) => {
      if (response.supplier && !supplierMap.has(response.supplier.id)) {
        if (supplierId && response.supplier.id !== supplierId) {
          return;
        }
        // Only include supplier if it's not removed in current version
        if (response.supplier.shortlist_status !== "removed") {
          supplierMap.set(response.supplier.id, response.supplier);
        }
      }
    });
    return Array.from(supplierMap.values());
  }, [responses, supplierId]);

  // Extract supplier names for context in AI text enhancement
  const supplierNames = useMemo(() => {
    return suppliers.map((s: any) => s.name);
  }, [suppliers]);

  const initialResponseStates = useMemo(() => {
    const initialState: ResponseState = {};

    responses.forEach((response: any) => {
      initialState[response.id] = getInitialStateFromResponse(response);
    });

    return initialState;
  }, [responses]);

  const [responseStates, setResponseStates] = useState<ResponseState>(
    () => initialResponseStates
  );

  // Ref to always have access to the latest responseStates (avoids stale closures)
  const responseStatesRef = useRef(responseStates);

  const isSingleSupplierView = suppliers.length === 1;

  // Find the selected node in the tree to check its type
  const isCategory = useMemo(() => {
    if (!selectedRequirementId || !tree.length) return false;

    const findNode = (nodes: TreeNode[], targetId: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }
        if (node.children) {
          const result = findNode(node.children, targetId);
          if (result) return result;
        }
      }
      return null;
    };

    const node = findNode(tree, selectedRequirementId);
    return node?.type === "category";
  }, [selectedRequirementId, tree]);

  // Fetch category requirements if a category is selected
  const {
    requirements: categoryRequirements,
    isLoading: categoryLoading,
    error: categoryError,
  } = useCategoryRequirements(
    rfpId || null,
    isCategory ? selectedRequirementId : null,
    activeVersion?.id ?? null
  );

  const requirement = getRequirementById(
    selectedRequirementId,
    allRequirements
  );
  // Filter responses for current requirement (already filtered by useResponses hook)
  // and optionally by supplierId
  const requirementResponses: any[] = useMemo(() => {
    const all = responses || [];
    if (supplierId) {
      return all.filter((r: any) => r.supplier_id === supplierId);
    }
    return all;
  }, [responses, supplierId]);

  const responsesBySupplierId = useMemo(() => {
    const mapping = new Map<string, ResponseWithSupplier>();
    requirementResponses.forEach((response: any) => {
      mapping.set(response.supplier_id, response);
    });
    return mapping;
  }, [requirementResponses]);

  // Build breadcrumb path with codes from tree
  const breadcrumbPath = useMemo(() => {
    if (!selectedRequirementId || !tree.length || isCategory) return [];

    const findPathWithCodes = (
      nodes: TreeNode[],
      targetId: string,
      path: Array<{ id: string; code: string; title: string }> = []
    ): Array<{ id: string; code: string; title: string }> | null => {
      for (const node of nodes) {
        const currentPath = [
          ...path,
          { id: node.id, code: node.code, title: node.title },
        ];

        if (node.id === targetId) {
          return currentPath;
        }

        if (node.children) {
          const result = findPathWithCodes(
            node.children,
            targetId,
            currentPath
          );
          if (result) return result;
        }
      }
      return null;
    };

    return findPathWithCodes(tree, selectedRequirementId) || [];
  }, [selectedRequirementId, tree, isCategory]);

  // Pagination: Get all leaf requirements in tree order (not hierarchy order)
  // This ensures pagination matches the sidebar navigation order
  const flatReqs = useMemo(() => {
    if (!tree.length) return [];

    const leaves: TreeNode[] = [];

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        // Only add leaf requirements (not categories)
        if (node.type === "requirement" && node.level === 4) {
          leaves.push(node);
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(tree);
    return leaves;
  }, [tree]);

  const currentIndex = flatReqs.findIndex(
    (r) => r.id === selectedRequirementId
  );
  const totalPages = flatReqs.length;

  const goToRequirement = (index: number) => {
    if (index >= 0 && index < flatReqs.length) {
      setIsLoading(true);
      setError(null);
      // Simulate loading delay
      setTimeout(() => {
        onRequirementChange(flatReqs[index].id);
        setIsLoading(false);
      }, 300);
    }
  };

  // Handle touch start for swipe detection
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isMobile && flatReqs.length > 0) {
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
        setSwipeDirection(null);
      }
    },
    [isMobile, flatReqs.length]
  );

  // Handle touch move to show feedback
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || flatReqs.length === 0) return;

      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;

      const deltaX = touchCurrentX - touchStartXRef.current;
      const deltaY = touchCurrentY - touchStartYRef.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if it looks like a horizontal swipe
      if (absDeltaX > 20 && absDeltaX > absDeltaY * SWIPE_RATIO_THRESHOLD) {
        setSwipeDirection(deltaX < 0 ? "left" : "right");
      } else {
        setSwipeDirection(null);
      }
    },
    [isMobile, flatReqs.length]
  );

  // Handle touch end for swipe detection
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || flatReqs.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if it's a horizontal swipe (not a vertical scroll)
      // Must move horizontally more than vertically
      if (
        absDeltaX > SWIPE_THRESHOLD &&
        absDeltaX > absDeltaY * SWIPE_RATIO_THRESHOLD
      ) {
        // Swipe left (negative deltaX) = next requirement
        // Swipe right (positive deltaX) = previous requirement
        if (deltaX < 0 && currentIndex < totalPages - 1) {
          goToRequirement(currentIndex + 1);
        } else if (deltaX > 0 && currentIndex > 0) {
          goToRequirement(currentIndex - 1);
        }
      }

      // Clear visual feedback
      setSwipeDirection(null);
    },
    [isMobile, flatReqs.length, currentIndex, totalPages]
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only trigger on arrow keys (left/right)
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Do not intercept arrow keys when the user is typing in a text field
        const tag = (event.target as HTMLElement)?.tagName;
        const isEditable =
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (event.target as HTMLElement)?.isContentEditable;
        if (isEditable) return;

        // Prevent default scrolling behavior
        event.preventDefault();

        const isLeftArrow = event.key === "ArrowLeft";

        if (isLeftArrow && currentIndex > 0) {
          // Previous requirement
          goToRequirement(currentIndex - 1);
        } else if (!isLeftArrow && currentIndex < totalPages - 1) {
          // Next requirement
          goToRequirement(currentIndex + 1);
        }
      }
    },
    [currentIndex, totalPages, flatReqs]
  );

  // Keyboard navigation: arrow keys for previous/next
  useEffect(() => {
    // Only add listener when we have requirements to navigate
    if (flatReqs.length === 0) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, flatReqs.length]);

  // Keep responseStatesRef in sync with responseStates to avoid stale closures
  useEffect(() => {
    responseStatesRef.current = responseStates;
  }, [responseStates]);

  // Initialize and sync response states with data from database
  // This ensures all response data is loaded on initial render
  useEffect(() => {
    if (!responses.length) return;

    setResponseStates((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      responses.forEach((response: any) => {
        const state = prev[response.id];

        if (!state) {
          // First time seeing this response - initialize with full DB data
          updated[response.id] = getInitialStateFromResponse(response);
          hasChanges = true;
        } else {
          // State already exists - sync with DB values if they changed
          const newState = { ...state };

          // Check if DB values differ from local state
          const dbChanged =
            state.manualScore !== response.manual_score ||
            state.status !== response.status ||
            state.manualComment !== (response.manual_comment || "") ||
            state.question !== (response.question || "") ||
            state.isChecked !== response.is_checked;

          if (dbChanged) {
            // DB was updated (likely by refetch after save)

            // CRITICAL: If we are currently saving this response, DO NOT sync from responses prop.
            // This prevents the "revert" bug where refetched data (still stale) overwrites our optimistic local state.
            if (state.isSaving) {
              return;
            }

            // Sync local state with fresh data, BUT only for fields not currently being edited
            newState.manualScore = response.manual_score ?? undefined;
            newState.status =
              (response.status as
                | "pass"
                | "partial"
                | "fail"
                | "pending"
                | "roadmap") || "pending";
            newState.isChecked = response.is_checked || false;

            // Only sync comment fields if they're not currently being edited
            if (!state.dirtyFields?.has("manualComment")) {
              newState.manualComment = response.manual_comment || "";
            }
            if (!state.dirtyFields?.has("question")) {
              newState.question = response.question || "";
            }

            updated[response.id] = newState;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [responses]);

  const updateResponseState = useCallback(
    (
      responseId: string,
      updates: Partial<ResponseState[string]>,
      immediate: boolean = false
    ) => {
      // Update local state immediately for UI responsiveness
      setResponseStates((prev) => {
        const prevState = prev[responseId];
        const newDirtyFields = new Set(prevState?.dirtyFields || []);

        if (updates.manualComment !== undefined && !immediate) {
          newDirtyFields.add("manualComment");
        }
        if (updates.question !== undefined && !immediate) {
          newDirtyFields.add("question");
        }

        return {
          ...prev,
          [responseId]: {
            ...prevState,
            ...updates,
            dirtyFields: newDirtyFields,
          },
        };
      });

      // Persist to database (optimistic update handled by mutation hook)
      const dbUpdates: Record<string, any> = {};
      if (updates.manualScore !== undefined)
        dbUpdates.manual_score = updates.manualScore;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.isChecked !== undefined)
        dbUpdates.is_checked = updates.isChecked;
      if (updates.manualComment !== undefined)
        dbUpdates.manual_comment = updates.manualComment;
      if (updates.question !== undefined) dbUpdates.question = updates.question;

      // Only call mutation if we have actual DB fields to update
      if (Object.keys(dbUpdates).length > 0) {
        // Check if this update includes comment fields
        const isCommentUpdate =
          updates.manualComment !== undefined || updates.question !== undefined;

        // For comment fields, only save on blur (immediate flag)
        // For other fields (score, status, checkbox), save immediately
        if (isCommentUpdate && !immediate) {
          // Don't save on onChange for comments, wait for blur
          return;
        }

        // Immediate update for:
        // - non-comment fields (score, status, checkbox)
        // - comment fields with immediate flag (onBlur)

        // Show saving indicator when API call starts
        setResponseStates((prev) => ({
          ...prev,
          [responseId]: {
            ...prev[responseId],
            isSaving: true,
          },
        }));

        mutation.mutate(
          {
            responseId,
            ...dbUpdates,
          },
          {
            onSuccess: () => {
              // Clear dirty flags and show "Saved" indicator
              setResponseStates((prev) => {
                const currentDirtyFields = new Set(
                  prev[responseId]?.dirtyFields || []
                );

                // Clear dirty flags for the fields we just saved
                if (updates.manualComment !== undefined) {
                  currentDirtyFields.delete("manualComment");
                }
                if (updates.question !== undefined) {
                  currentDirtyFields.delete("question");
                }

                return {
                  ...prev,
                  [responseId]: {
                    ...prev[responseId],
                    isSaving: false,
                    showSaved: true,
                    dirtyFields: currentDirtyFields,
                  },
                };
              });

              // Only refetch if we saved fields other than comments/questions
              // Comments and questions are never modified by the server, so we already have the correct value
              const savedNonCommentFields =
                updates.manualScore !== undefined ||
                updates.status !== undefined ||
                updates.isChecked !== undefined;
              if (savedNonCommentFields) {
                refetchResponses();
              }

              // Clear existing timer
              if (savedTimers.current[responseId]) {
                clearTimeout(savedTimers.current[responseId]);
              }

              // Hide "Saved" after 2 seconds
              savedTimers.current[responseId] = setTimeout(() => {
                setResponseStates((prev) => ({
                  ...prev,
                  [responseId]: {
                    ...prev[responseId],
                    showSaved: false,
                  },
                }));
                delete savedTimers.current[responseId];
              }, 2000);
            },
            onError: () => {
              // Hide saving indicator on error
              setResponseStates((prev) => ({
                ...prev,
                [responseId]: {
                  ...prev[responseId],
                  isSaving: false,
                  showSaved: false,
                },
              }));
            },
          }
        );
      }
    },
    [mutation, refetchResponses]
  );

  // Toggle expand/collapse all responses
  const toggleExpandAll = () => {
    // Check if all are currently expanded
    const allExpanded = requirementResponses.every(
      (r: any) => responseStates[r.id]?.expanded ?? false
    );

    // Toggle all to the opposite state
    const newExpandedState = !allExpanded;

    // Update all response states
    setResponseStates((prev) => {
      const newStates = { ...prev };
      requirementResponses.forEach((response: any) => {
        newStates[response.id] = {
          ...newStates[response.id],
          expanded: newExpandedState,
        };
      });
      return newStates;
    });
  };

  // Check if all responses are currently expanded
  const allExpanded =
    requirementResponses.length > 0 &&
    requirementResponses.every((r) => responseStates[r.id]?.expanded ?? false);

  // Check if all responses for current requirement are checked
  const allResponsesChecked =
    requirementResponses.length > 0 &&
    requirementResponses.every((r) => responseStates[r.id]?.isChecked ?? false);

  // Auto-trigger peer review when all responses become checked
  useEffect(() => {
    if (
      !peerReviewEnabled ||
      !rfpId ||
      !activeVersion?.id ||
      !userAccessLevel ||
      !requirement?.id
    )
      return;

    const { requirementId: prevReqId, prevAllChecked } =
      autoReviewStateRef.current;
    const requirementChanged = prevReqId !== requirement.id;

    autoReviewStateRef.current = {
      requirementId: requirement.id,
      prevAllChecked: allResponsesChecked,
    };

    // Reset without triggering on requirement navigation
    if (requirementChanged) return;

    // Only trigger on false → true transition
    if (!allResponsesChecked || prevAllChecked) return;

    const currentStatus =
      reviewStatuses?.get(requirement.id)?.status ?? "draft";
    if (currentStatus !== "draft" && currentStatus !== "rejected") return;

    const isOwnerOrAdmin =
      userAccessLevel === "owner" || userAccessLevel === "admin";
    peerReviewMutation.mutate({
      requirementId: requirement.id,
      status: isOwnerOrAdmin ? "approved" : "submitted",
      version_id: activeVersion.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResponsesChecked, requirement?.id]);

  // Handle opening supplier documents in PDF viewer
  const handleOpenSupplierDocuments = useCallback(
    async (supplierId: string) => {
      if (!rfpId || isMobile) return;

      setLoadingSupplierDocs(true);
      try {
        const response = await fetch(
          `/api/rfps/${rfpId}/documents?supplierId=${supplierId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch supplier documents");
        }
        const data = await response.json();
        setSupplierDocuments(data.documents || []);
        setIsPdfViewerOpen(true);
      } catch (error) {
        console.error("Error fetching supplier documents:", error);
        setSupplierDocuments([]);
      } finally {
        setLoadingSupplierDocs(false);
      }
    },
    [isMobile, rfpId]
  );

  const handleOpenBookmark = useCallback(
    async (bookmark: PDFAnnotation) => {
      if (!bookmark.supplierId || !rfpId || isMobile) return;

      // Set initial state for PDF viewer
      setInitialPdfState({
        documentId: bookmark.documentId,
        page: bookmark.pageNumber,
      });

      // Fetch documents if needed (reusing logic from handleOpenSupplierDocuments)
      // We always fetch to ensure we have the latest list and the viewer works correctly
      setLoadingSupplierDocs(true);
      try {
        const response = await fetch(
          `/api/rfps/${rfpId}/documents?supplierId=${bookmark.supplierId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch supplier documents");
        }
        const data = await response.json();
        setSupplierDocuments(data.documents || []);
        setIsPdfViewerOpen(true);
      } catch (error) {
        console.error("Error fetching supplier documents:", error);
        setSupplierDocuments([]);
      } finally {
        setLoadingSupplierDocs(false);
      }
    },
    [isMobile, rfpId]
  );

  const handleOpenContextPDF = useCallback(async () => {
    if (!rfpId || !selectedRequirement) return;

    console.log("[ComparisonView] handleOpenContextPDF called", {
      requirementId: selectedRequirement.id,
      rf_document_id: selectedRequirement.rf_document_id,
      position_in_pdf: selectedRequirement.position_in_pdf,
      pageNumber: (selectedRequirement.position_in_pdf as any)?.page_number,
      availableDocumentsCount: availableDocuments.length,
    });

    // Check if requirement has document reference and/or page number OR if there's a default cahier_charges document
    if (
      !selectedRequirement.rf_document_id &&
      !selectedRequirement.position_in_pdf?.page_number &&
      availableDocuments.length === 0
    ) {
      console.warn(
        "Requirement has no document reference, no page number, and no default cahier_charges document"
      );
      return;
    }

    setLoadingSupplierDocs(true);
    try {
      // Use available documents from hook (already filtered for cahier_charges PDFs)
      const documents =
        availableDocuments.length > 0
          ? availableDocuments
          : await loadDocuments();

      // Find the document linked to this requirement
      let targetDocumentId = selectedRequirement.rf_document_id;
      if (!targetDocumentId && documents.length > 0) {
        // If no specific document is linked, use the first available cahier_charges document
        targetDocumentId = documents[0].id;
      }

      if (!targetDocumentId) {
        console.warn("No document found to open");
        return;
      }

      const pageNumber =
        (selectedRequirement.position_in_pdf as any)?.page_number || null;
      console.log("[ComparisonView] Opening PDF with state:", {
        documentId: targetDocumentId,
        page: pageNumber,
      });

      // Set up PDF viewer state
      setInitialPdfState({
        documentId: targetDocumentId,
        page: pageNumber,
      });

      setSupplierDocuments(documents);
      setIsPdfViewerOpen(true);
    } catch (error) {
      console.error("Error opening context PDF:", error);
    } finally {
      setLoadingSupplierDocs(false);
    }
  }, [availableDocuments, loadDocuments, rfpId, selectedRequirement]);

  const buildCardHandlers = useCallback(
    (responseId: string, supplierId: string) => ({
      onStatusChange: (status: ResponseState[string]["status"]) =>
        updateResponseState(responseId, { status }),
      onCheckChange: (isChecked: boolean) =>
        updateResponseState(responseId, { isChecked }),
      onScoreChange: (manualScore: number | undefined) =>
        updateResponseState(responseId, { manualScore }),
      onExpandChange: (expanded: boolean) =>
        updateResponseState(responseId, { expanded }),
      onCommentChange: (manualComment: string) =>
        updateResponseState(responseId, { manualComment }),
      onQuestionChange: (question: string) =>
        updateResponseState(responseId, { question }),
      onCommentBlur: () =>
        updateResponseState(
          responseId,
          {
            manualComment:
              responseStatesRef.current[responseId]?.manualComment || "",
          },
          true
        ),
      onQuestionBlur: () =>
        updateResponseState(
          responseId,
          {
            question: responseStatesRef.current[responseId]?.question || "",
          },
          true
        ),
      onAICommentUpdate: () => {
        refetchResponses();
      },
      onOpenDocuments: () => handleOpenSupplierDocuments(supplierId),
      onOpenBookmark: handleOpenBookmark,
    }),
    [
      handleOpenBookmark,
      handleOpenSupplierDocuments,
      refetchResponses,
      updateResponseState,
    ]
  );

  const cardHandlersByResponseId = useMemo(() => {
    const mapping = new Map<string, ReturnType<typeof buildCardHandlers>>();

    suppliers.forEach((supplier) => {
      const response = responsesBySupplierId.get(supplier.id);
      if (response) {
        mapping.set(response.id, buildCardHandlers(response.id, supplier.id));
      }
    });

    return mapping;
  }, [buildCardHandlers, responsesBySupplierId, suppliers]);

  // const handleDeleteBookmark = useCallback(
  //   (bookmark: PDFAnnotation) => {
  //     if (confirm("Êtes-vous sûr de vouloir supprimer ce signet ?")) {
  //       deleteAnnotation({ id: bookmark.id, documentId: bookmark.documentId });
  //     }
  //   },
  //   [deleteAnnotation],
  // );

  // If a category is selected, show requirements table
  if (isCategory) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Exigences de la catégorie
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Vue d'ensemble des exigences et de leur statut
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {categoryLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : categoryError ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                Erreur lors du chargement des exigences
              </p>
            </div>
          ) : categoryRequirements.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-12 text-center max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <svg
                    className="h-8 w-8 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-2">
                  Aucune exigence trouvée
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cette catégorie ne contient pas encore d'exigences
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Code</TableHead>
                    <TableHead className="w-[250px]">Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[160px]">Statut</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRequirements.map((req) => (
                    <TableRow
                      key={req.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <TableCell className="font-medium">
                        {req.requirement_id_external}
                      </TableCell>
                      <TableCell className="font-medium">{req.title}</TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-500 text-xs">
                        <div className="line-clamp-2">
                          {req.description || (
                            <span className="italic text-slate-400">
                              Aucune description
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {peerReviewEnabled ? (
                          (() => {
                            const prStatus =
                              reviewStatuses?.get(req.id)?.status ?? "draft";
                            if (prStatus === "approved")
                              return (
                                <Badge className="bg-green-500 text-white px-3 py-1.5 text-sm font-medium">
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                  Validé
                                </Badge>
                              );
                            if (prStatus === "rejected")
                              return (
                                <Badge className="bg-red-500 text-white px-3 py-1.5 text-sm font-medium">
                                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                                  Rejeté
                                </Badge>
                              );
                            if (prStatus === "submitted")
                              return (
                                <Badge className="bg-blue-500 text-white px-3 py-1.5 text-sm font-medium">
                                  <Clock className="w-4 h-4 mr-1.5" />À valider
                                </Badge>
                              );
                            // draft — distinguish by completion
                            if (req.status === "pending")
                              return (
                                <Badge
                                  variant="outline"
                                  className="px-3 py-1.5 text-sm font-medium text-slate-400"
                                >
                                  <Circle className="w-4 h-4 mr-1.5" />
                                  Non initié
                                </Badge>
                              );
                            return (
                              <Badge className="bg-amber-500 text-white px-3 py-1.5 text-sm font-medium">
                                <Clock className="w-4 h-4 mr-1.5" />
                                En cours
                              </Badge>
                            );
                          })()
                        ) : (
                          <>
                            {req.status === "pass" && (
                              <Badge className="bg-green-500 text-white px-3 py-1.5 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                Validé
                              </Badge>
                            )}
                            {(req.status === "partial" ||
                              req.status === "fail") && (
                              <Badge className="bg-amber-500 text-white px-3 py-1.5 text-sm font-medium">
                                <Clock className="w-4 h-4 mr-1.5" />
                                En cours
                              </Badge>
                            )}
                            {req.status === "pending" && (
                              <Badge
                                variant="outline"
                                className="px-3 py-1.5 text-sm font-medium text-slate-400"
                              >
                                <Circle className="w-4 h-4 mr-1.5" />
                                Non initié
                              </Badge>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRequirementChange(req.id)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">
          Exigence non trouvée
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe direction indicator - Mobile only */}
      {isMobile && swipeDirection && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-75 z-50" />
      )}

      {/* Breadcrumb - Hidden on mobile */}
      {!isMobile && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbPath.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <BreadcrumbSeparator />}
                  {idx === breadcrumbPath.length - 1 ? (
                    <BreadcrumbPage className="text-slate-900 dark:text-white font-medium">
                      {item.code}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbLink className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        {item.code}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  )}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Header with pagination */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800">
        <div
          className={`flex ${isMobile ? "flex-col gap-3" : "items-start justify-between"}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2
                className={`${isMobile ? "text-lg" : "text-2xl"} font-bold text-slate-900 dark:text-white`}
              >
                {requirement.title}
              </h2>
              {peerReviewEnabled ? (
                <PeerReviewBadge
                  status={
                    reviewStatuses?.get(requirement.id)?.status ?? "draft"
                  }
                  iconOnly={isMobile}
                />
              ) : allResponsesChecked ? (
                <Badge className="bg-green-500 px-2 py-1">
                  <CheckCircle2 className="w-4 h-4" />
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="px-2 py-1 border-dashed border-slate-300 dark:border-slate-600"
                >
                  <Clock className="w-4 h-4" />
                </Badge>
              )}
              {peerReviewEnabled &&
                rfpId &&
                activeVersion &&
                userAccessLevel && (
                  <PeerReviewActionButton
                    requirementId={requirement.id}
                    rfpId={rfpId}
                    versionId={activeVersion.id}
                    status={
                      reviewStatuses?.get(requirement.id)?.status ?? "draft"
                    }
                    userAccessLevel={userAccessLevel}
                  />
                )}
            </div>
            {!isMobile && (
              <div className="relative">
                <p
                  className={`text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ${
                    !descriptionExpanded ? "line-clamp-5" : ""
                  }`}
                >
                  {requirement.description}
                </p>
                {requirement.description &&
                  requirement.description.split("\n").length > 5 && (
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          setDescriptionExpanded(!descriptionExpanded)
                        }
                        className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {descriptionExpanded ? "Voir moins" : "Voir plus"}
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${
                            descriptionExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Pagination controls */}
          <div
            className={`flex items-center gap-2 ${isMobile ? "justify-center" : "ml-6"} flex-shrink-0`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToRequirement(currentIndex - 1)}
              disabled={currentIndex === 0 || isLoading}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[50px] text-center">
              {currentIndex + 1}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToRequirement(currentIndex + 1)}
              disabled={currentIndex === totalPages - 1 || isLoading}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Context section - Collapsible - Hidden on mobile */}
      {!isMobile && (
        <div className="border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Contexte du cahier des charges
            </span>
            {contextExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400 rotate-0" />
            )}
          </button>

          {contextExpanded && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {requirement.context}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenContextPDF}
                disabled={
                  isMobile ||
                  loadingSupplierDocs ||
                  (!selectedRequirement?.rf_document_id &&
                    !selectedRequirement?.position_in_pdf?.page_number &&
                    availableDocuments.length === 0)
                }
              >
                {loadingSupplierDocs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ouverture...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir dans le PDF
                    {requirement.position_in_pdf?.page_number && (
                      <span className="text-xs ml-2 opacity-70">
                        (p. {requirement.position_in_pdf.page_number})
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className={isMobile ? "p-3" : "p-6"}>
            {/* Mobile: Requirement info section */}
            {isMobile && (
              <div className="mb-4 space-y-3">
                {/* Requirement title */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {requirement.title}
                  </h3>
                  {requirement.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {requirement.description}
                    </p>
                  )}
                </div>

                {/* Context accordion */}
                {requirement.context && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                      onClick={() => setContextExpanded(!contextExpanded)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Contexte du cahier des charges
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${
                          contextExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {contextExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {requirement.context}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {requirementResponses.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-12 text-center max-w-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <svg
                      className="h-8 w-8 text-slate-400 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-2">
                    Aucune réponse disponible
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Les fournisseurs n'ont pas encore soumis de réponses pour
                    cette exigence
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Expand/Collapse all button - discreet placement - Hidden on mobile */}
                {!isSingleSupplierView && !isMobile && (
                  <div className="flex justify-end mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleExpandAll}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      {allExpanded ? (
                        <>
                          <ChevronsUp className="w-3.5 h-3.5 mr-1.5" />
                          Tout réduire
                        </>
                      ) : (
                        <>
                          <ChevronsDown className="w-3.5 h-3.5 mr-1.5" />
                          Tout déplier
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {suppliers.map((supplier) => {
                    const response = responsesBySupplierId.get(supplier.id);
                    if (!response) return null;

                    const state =
                      responseStates[response.id] ||
                      initialResponseStates[response.id] ||
                      getInitialStateFromResponse(response);

                    const handlers = cardHandlersByResponseId.get(response.id);
                    if (!handlers) return null;

                    const commonCardProps = {
                      key: response.id,
                      supplierId: supplier.id,
                      supplierName: supplier.name,
                      responseId: response.id,
                      responseText: response.response_text || "",
                      aiScore: response.ai_score ?? 0,
                      aiComment: response.ai_comment ?? "",
                      status: state.status,
                      isChecked: state.isChecked,
                      manualScore: state.manualScore,
                      manualComment: state.manualComment,
                      questionText: state.question,
                      isSaving: state.isSaving,
                      showSaved: state.showSaved,
                      supplierNames,
                      userAccessLevel,
                      rfpId,
                    };

                    // Use mobile-optimized card on mobile devices
                    if (isMobile) {
                      return (
                        <MemoizedMobileSupplierCard
                          {...commonCardProps}
                          requirementTitle={selectedRequirement?.title || ""}
                          requirementDescription={
                            selectedRequirement?.description || ""
                          }
                          requirementId={selectedRequirementId}
                          onStatusChange={handlers.onStatusChange}
                          onCheckChange={handlers.onCheckChange}
                          onScoreChange={handlers.onScoreChange}
                          onCommentChange={handlers.onCommentChange}
                          onQuestionChange={handlers.onQuestionChange}
                          onCommentBlur={handlers.onCommentBlur}
                          onQuestionBlur={handlers.onQuestionBlur}
                          onAICommentUpdate={handlers.onAICommentUpdate}
                          threadCount={threadStatsByResponseId?.get(response.id)?.total ?? 0}
                          openThreadCount={threadStatsByResponseId?.get(response.id)?.open ?? 0}
                          hasBlockingThread={threadStatsByResponseId?.get(response.id)?.hasBlocking ?? false}
                          onOpenThreadPanel={
                            onOpenThreadPanel
                              ? () =>
                                  onOpenThreadPanel(
                                    response.id,
                                    supplier.name,
                                    requirement?.title || ""
                                  )
                              : undefined
                          }
                        />
                      );
                    }

                    return (
                      <MemoizedSupplierResponseCard
                        {...commonCardProps}
                        isExpanded={
                          isSingleSupplierView ? true : state.expanded
                        }
                        collapsible={!isSingleSupplierView}
                        onExpandChange={handlers.onExpandChange}
                        onStatusChange={handlers.onStatusChange}
                        onCheckChange={handlers.onCheckChange}
                        onScoreChange={handlers.onScoreChange}
                        onCommentChange={handlers.onCommentChange}
                        onQuestionChange={handlers.onQuestionChange}
                        onCommentBlur={handlers.onCommentBlur}
                        onQuestionBlur={handlers.onQuestionBlur}
                        onOpenDocuments={handlers.onOpenDocuments}
                        hasDocuments={response.supplier?.has_documents}
                        requirementId={selectedRequirementId}
                        requirementTitle={requirement?.title || ""}
                        requirementDescription={requirement?.description || ""}
                        onOpenBookmark={handlers.onOpenBookmark}
                        onAICommentUpdate={handlers.onAICommentUpdate}
                        threadCount={threadStatsByResponseId?.get(response.id)?.total ?? 0}
                        openThreadCount={threadStatsByResponseId?.get(response.id)?.open ?? 0}
                        hasBlockingThread={threadStatsByResponseId?.get(response.id)?.hasBlocking ?? false}
                        onOpenThreadPanel={
                          onOpenThreadPanel
                            ? () =>
                                onOpenThreadPanel(
                                  response.id,
                                  supplier.name,
                                  requirement?.title || ""
                                )
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer Sheet for Supplier Documents - Only render on desktop */}
      {!isMobile && (
        <PDFViewerSheet
          isOpen={isPdfViewerOpen}
          onOpenChange={setIsPdfViewerOpen}
          documents={supplierDocuments}
          rfpId={rfpId}
          requirementId={selectedRequirementId}
          requirements={allRequirements.map((r) => ({
            id: r.id,
            title: r.title,
            requirement_id_external: (r as any).requirement_id_external || r.id,
            description: r.description ?? undefined,
          }))}
          initialDocumentId={initialPdfState.documentId}
          initialPage={initialPdfState.page}
        />
      )}
    </div>
  );
}
