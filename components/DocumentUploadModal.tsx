"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { RFPDocumentUpload } from "@/components/RFPDocumentUpload";

interface DocumentUploadModalProps {
  rfpId: string;
  rfpTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function DocumentUploadModal({
  rfpId,
  rfpTitle,
  isOpen,
  onOpenChange,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un document PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Ajouter des documents PDF pour le RFP: <span className="font-semibold">{rfpTitle}</span>
          </p>
          <RFPDocumentUpload
            rfpId={rfpId}
            onUploadSuccess={() => {
              onUploadSuccess?.();
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
