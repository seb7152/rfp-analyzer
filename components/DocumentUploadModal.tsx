"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RFPDocumentUpload } from "@/components/RFPDocumentUpload";
import { RFPDocumentsList } from "@/components/RFPDocumentsList";
import { useRFPDocuments } from "@/hooks/useRFPDocuments";

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
  const [activeTab, setActiveTab] = useState<"upload" | "documents">("upload");
  const { documents, isLoading, error, deleteDocument, refreshDocuments } =
    useRFPDocuments(rfpId);

  const handleUploadSuccess = () => {
    refreshDocuments();
    setActiveTab("documents");
    onUploadSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gérer les documents - {rfpTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "upload"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ajouter un document
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "documents"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Documents ({documents.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Ajouter des documents (PDF, Excel, Word) pour le RFP:{" "}
                <span className="font-semibold">{rfpTitle}</span>
              </p>
              <RFPDocumentUpload
                rfpId={rfpId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <RFPDocumentsList
                documents={documents}
                isLoading={isLoading}
                onDelete={deleteDocument}
                rfpId={rfpId}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
