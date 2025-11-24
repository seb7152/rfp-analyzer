"use client";

import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Bookmark, Loader2 } from "lucide-react";
import type { RequirementInfo } from "./types/annotation.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  onConfirm: (noteContent: string, requirementId?: string) => void;
  isCreating?: boolean;
  requirements?: RequirementInfo[];
  defaultRequirementId?: string;
}

export function SelectionDialog({
  open,
  onOpenChange,
  selectedText,
  onConfirm,
  isCreating = false,
  requirements = [],
  defaultRequirementId,
}: SelectionDialogProps) {
  const [noteContent, setNoteContent] = useState("");
  const [requirementId, setRequirementId] = useState<string>(
    defaultRequirementId || "none"
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setNoteContent("");
      setRequirementId(defaultRequirementId || "none");
    }
  }, [open, defaultRequirementId]);

  const handleConfirm = () => {
    const finalRequirementId =
      requirementId === "none" ? undefined : requirementId;
    onConfirm(noteContent, finalRequirementId);
    // Reset state (will be handled by useEffect on next open, but good to reset for current component instance)
    setNoteContent("");
    setRequirementId(defaultRequirementId || "none");
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setNoteContent("");
    setRequirementId(defaultRequirementId || "none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            Créer un signet
          </DialogTitle>
          <DialogDescription>
            Ajoutez un commentaire pour ce passage sélectionné. Vous pouvez
            également lier ce signet à une exigence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Texte sélectionné (lecture seule) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Texte sélectionné
            </Label>
            <div className="relative pl-3">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-blue-500" />
              <p className="text-sm text-gray-700 italic leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 max-h-32 overflow-y-auto">
                "{selectedText}"
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {selectedText.length} caractères
            </p>
          </div>

          {/* Commentaire (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="note-content" className="text-sm font-medium">
              Commentaire{" "}
              <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="note-content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Ajoutez vos notes ou réflexions sur ce passage..."
              rows={4}
              className="resize-none focus-visible:ring-blue-500"
            />
          </div>

          {/* Lier à une exigence (optionnel) */}
          {requirements.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="requirement" className="text-sm font-medium">
                Lier à une exigence{" "}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </Label>
              <Select value={requirementId} onValueChange={setRequirementId}>
                <SelectTrigger id="requirement">
                  <SelectValue placeholder="Sélectionner une exigence..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-gray-400">Aucune exigence</span>
                  </SelectItem>
                  {requirements.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {req.requirement_id_external}
                        </Badge>
                        <span className="text-sm truncate max-w-[300px]">
                          {req.title}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Créer le signet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
