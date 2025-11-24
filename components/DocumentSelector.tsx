"use client";

import React, { useState } from "react";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Requirement } from "@/lib/supabase/types";

interface Document {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
}

interface DocumentSelectorProps {
  isOpen: boolean;
  isLoading?: boolean;
  requirement: Requirement | null;
  documents: Document[];
  onSelectDocument: (documentId: string) => Promise<void>;
  onCancel: () => void;
}

export function DocumentSelector({
  isOpen,
  isLoading = false,
  requirement,
  documents,
  onSelectDocument,
  onCancel,
}: DocumentSelectorProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async () => {
    if (!selectedDocId || !requirement) {
      setError("Please select a document");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Call the select handler from parent
      await onSelectDocument(selectedDocId);

      // If we get here, it was successful - update the requirement in the DB
      const response = await fetch(
        `/api/rfps/${requirement.rfp_id}/requirements/${requirement.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rf_document_id: selectedDocId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update requirement document link");
      }

      // Close the dialog
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to select document"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedDocId(null);
    setError(null);
    onCancel();
  };

  if (!isOpen || !requirement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Document</DialogTitle>
          <DialogDescription>
            Multiple specification documents found for this RFP. Choose which
            document contains this requirement ({requirement.requirement_id_external}).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No specification documents found
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full flex items-start gap-3 p-3 rounded border text-left transition-colors ${
                  selectedDocId === doc.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <FileText className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {doc.original_filename || doc.filename}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {doc.filename}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      selectedDocId === doc.id
                        ? "bg-blue-500 border-blue-500"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedDocId || isUpdating || documents.length === 0}
          >
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUpdating ? "Linking..." : "Link Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
