"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Trash2,
  Loader2,
  FileUp,
  FileArchive,
  Eye,
} from "lucide-react";
import { RFPDocument } from "@/hooks/useRFPDocuments";
import { PDFViewerSheet } from "@/components/PDFViewerSheet";

interface RFPDocumentsListProps {
  documents: RFPDocument[];
  isLoading: boolean;
  onDelete: (documentId: string) => Promise<void>;
  rfpId?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-500" />;
  } else if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return <FileArchive className="h-5 w-5 text-green-500" />;
  } else if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileArchive className="h-5 w-5 text-blue-500" />;
  }
  return <FileUp className="h-5 w-5 text-slate-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDocumentTypeLabel(documentType: string | null): {
  label: string;
  color: string;
} {
  if (!documentType) {
    return { label: "Non spécifié", color: "slate" };
  }

  if (documentType === "cahier_charges") {
    return { label: "Cahier des charges", color: "blue" };
  }

  if (documentType.startsWith("supplier_")) {
    // Extract supplier ID and return generic label
    // The actual supplier name would come from a lookup
    return { label: "Document de fournisseur", color: "green" };
  }

  return { label: documentType, color: "slate" };
}

export function RFPDocumentsList({
  documents,
  isLoading,
  onDelete,
  rfpId,
}: RFPDocumentsListProps) {
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [supplierNames, setSupplierNames] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    // Load supplier names for supplier response documents
    const loadSupplierNames = async () => {
      if (!rfpId) return;

      const supplierDocsIds = documents
        .filter((doc) => doc.document_type === "supplier_response")
        .map((doc) => doc.id);

      if (supplierDocsIds.length === 0) return;

      const newSupplierNames: Record<string, string> = {};

      for (const docId of supplierDocsIds) {
        try {
          const response = await fetch(
            `/api/rfps/${rfpId}/documents/${docId}/supplier`,
          );
          if (response.ok) {
            const data = await response.json();
            if (data.supplierName) {
              newSupplierNames[docId] = data.supplierName;
            }
          }
        } catch (error) {
          console.error(`Error fetching supplier name for ${docId}:`, error);
        }
      }

      if (Object.keys(newSupplierNames).length > 0) {
        setSupplierNames(newSupplierNames);
      }
    };

    loadSupplierNames();
  }, [documents, rfpId]);

  const handleDelete = async (documentId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document?")) {
      setDeleting(documentId);
      try {
        await onDelete(documentId);
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Erreur lors de la suppression du document");
      } finally {
        setDeleting(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        <span className="ml-2 text-sm text-slate-500">
          Chargement des documents...
        </span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-10 w-10 text-slate-300 mb-2" />
        <p className="text-sm text-slate-600">Aucun document uploadé</p>
        <p className="text-xs text-slate-500 mt-1">
          Commencez par ajouter des documents PDF, Excel ou Word
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-3 hover:bg-slate-50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                {getFileIcon(doc.mime_type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {doc.original_filename || doc.filename}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-500">
                    {formatFileSize(doc.file_size)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">
                    {formatDate(doc.created_at)}
                  </span>
                  {doc.document_type && (
                    <>
                      <span className="text-slate-300">•</span>
                      <Badge variant="outline" className="text-xs">
                        {getDocumentTypeLabel(doc.document_type).label}
                      </Badge>
                    </>
                  )}
                  {doc.document_type === "supplier_response" &&
                    supplierNames[doc.id] && (
                      <>
                        <span className="text-slate-300">•</span>
                        <Badge
                          className="text-xs bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                          variant="outline"
                        >
                          {supplierNames[doc.id]}
                        </Badge>
                      </>
                    )}
                </div>
              </div>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              {doc.mime_type === "application/pdf" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfViewerOpen(true)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="View PDF"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleting === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {/* PDF Viewer Sheet */}
      <PDFViewerSheet
        isOpen={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        documents={documents}
        rfpId={rfpId}
      />
    </div>
  );
}
