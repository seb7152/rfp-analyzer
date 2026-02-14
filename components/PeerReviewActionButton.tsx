"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PeerReviewConfirmDialog } from "@/components/PeerReviewConfirmDialog";
import { usePeerReviewMutation } from "@/hooks/use-peer-review";
import type { PeerReviewStatus } from "@/types/peer-review";

type AccessLevel = "owner" | "admin" | "evaluator" | "viewer";

interface PeerReviewActionButtonProps {
  requirementId: string;
  rfpId: string;
  versionId: string;
  status: PeerReviewStatus;
  userAccessLevel: AccessLevel;
}

interface DialogState {
  open: boolean;
  action: "approve" | "reject" | null;
}

export function PeerReviewActionButton({
  requirementId,
  rfpId,
  versionId,
  status,
  userAccessLevel,
}: PeerReviewActionButtonProps) {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    action: null,
  });

  const mutation = usePeerReviewMutation({ rfpId, versionId });

  const handleConfirm = (comment?: string) => {
    if (!dialog.action) return;

    const targetStatus: Exclude<PeerReviewStatus, "draft"> =
      dialog.action === "approve" ? "approved" : "rejected";

    mutation.mutate(
      {
        requirementId,
        status: targetStatus,
        version_id: versionId,
        ...(dialog.action === "reject" && { rejection_comment: comment }),
      },
      {
        onSettled: () => setDialog({ open: false, action: null }),
      }
    );
  };

  const handleCancel = () => setDialog({ open: false, action: null });

  const isOwnerOrAdmin =
    userAccessLevel === "owner" || userAccessLevel === "admin";

  const canApprove = isOwnerOrAdmin && status === "submitted";
  const canReject = isOwnerOrAdmin && status === "submitted";

  if (!canApprove && !canReject) {
    return null;
  }

  const dialogConfig: Record<
    "approve" | "reject",
    {
      title: string;
      description: string;
      showCommentField: boolean;
      commentLabel?: string;
    }
  > = {
    approve: {
      title: "Valider l'exigence",
      description: "Confirmer la validation de cette exigence ?",
      showCommentField: false,
    },
    reject: {
      title: "Rejeter l'exigence",
      description:
        "Rejeter cette exigence et la renvoyer en cours d'évaluation. Un commentaire peut être ajouté.",
      showCommentField: true,
      commentLabel: "Motif de rejet (optionnel)",
    },
  };

  const currentConfig = dialog.action ? dialogConfig[dialog.action] : null;

  return (
    <>
      <div className="flex items-center gap-2">
        {canApprove && (
          <Button
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
            onClick={() => setDialog({ open: true, action: "approve" })}
            disabled={mutation.isPending}
          >
            Valider
          </Button>
        )}
        {canReject && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => setDialog({ open: true, action: "reject" })}
            disabled={mutation.isPending}
          >
            Rejeter
          </Button>
        )}
      </div>

      {currentConfig && (
        <PeerReviewConfirmDialog
          open={dialog.open}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          title={currentConfig.title}
          description={currentConfig.description}
          showCommentField={currentConfig.showCommentField}
          commentLabel={currentConfig.commentLabel}
          isLoading={mutation.isPending}
        />
      )}
    </>
  );
}
