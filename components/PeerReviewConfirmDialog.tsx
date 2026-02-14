"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PeerReviewConfirmDialogProps {
  open: boolean;
  onConfirm: (comment?: string) => void;
  onCancel: () => void;
  title: string;
  description: string;
  showCommentField?: boolean;
  commentLabel?: string;
  isLoading?: boolean;
}

export function PeerReviewConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  showCommentField = false,
  commentLabel = "Commentaire",
  isLoading = false,
}: PeerReviewConfirmDialogProps) {
  const [comment, setComment] = useState("");

  const handleConfirm = () => {
    onConfirm(showCommentField ? comment : undefined);
    setComment("");
  };

  const handleCancel = () => {
    setComment("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showCommentField && (
          <div className="space-y-2">
            <Label htmlFor="peer-review-comment">{commentLabel}</Label>
            <Textarea
              id="peer-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Saisissez un commentaire…"
              rows={3}
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
