"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  FileText,
  Trash2,
  Loader2,
  FileUp,
  FileArchive,
  Eye,
  Code,
  Download,
  CheckCircle,
  Star,
  RotateCcw,
} from "lucide-react";
import { RFPDocument } from "@/hooks/useRFPDocuments";
import { PDFViewerSheet } from "@/components/PDFViewerSheet";

interface RFPDocumentsListProps {
  documents: RFPDocument[];
  isLoading: boolean;
  onDelete: (documentId: string) => Promise<void>;
  rfpId?: string;
  onSetDefaultDocument?: (documentId: string) => Promise<void>;
}

function getFileIcon(mimeType: string, filename?: string) {
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
  } else if (
    mimeType === "text/x-python" ||
    mimeType === "text/x-shellscript" ||
    mimeType === "application/x-sh" ||
    (mimeType === "text/plain" &&
      filename &&
      [".py", ".sh"].some((ext) => filename.toLowerCase().endsWith(ext)))
  ) {
    return <Code className="h-5 w-5 text-purple-500" />;
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

interface DocumentGroup {
  title: string;
  documents: RFPDocument[];
  supplierId?: string;
}

function groupDocumentsByCategory(
  documents: RFPDocument[],
  supplierNames: Record<string, string>
): DocumentGroup[] {
  const groups: Record<string, DocumentGroup> = {};

  // Group supplier responses by supplier
  documents.forEach((doc) => {
    if (doc.document_type === "supplier_response") {
      const supplierName = supplierNames[doc.id] || "Unknown Supplier";
      if (!groups[supplierName]) {
        groups[supplierName] = {
          title: supplierName,
          documents: [],
          supplierId: doc.id,
        };
      }
      groups[supplierName].documents.push(doc);
    }
  });

  // Group other documents (cahier_charges, script_import) in one category
  const otherDocs = documents.filter(
    (doc) =>
      doc.document_type === "cahier_charges" ||
      doc.document_type === "script_import" ||
      !doc.document_type
  );

  if (otherDocs.length > 0) {
    groups["Autres spécifications"] = {
      title: "Autres spécifications",
      documents: otherDocs,
    };
  }

  // Return as array sorted by name (Autres spécifications at the end)
  return Object.values(groups).sort((a, b) => {
    if (a.title === "Autres spécifications") return 1;
    if (b.title === "Autres spécifications") return -1;
    return a.title.localeCompare(b.title);
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

  if (documentType === "script_import") {
    return { label: "Script d'import", color: "purple" };
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
  onSetDefaultDocument,
}: RFPDocumentsListProps) {
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [settingDefault, setSettingDefault] = React.useState<string | null>(
    null
  );
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
            `/api/rfps/${rfpId}/documents/${docId}/supplier`
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
    setDeleting(documentId);
    try {
      await onDelete(documentId);
    } catch (error) {
      alert("Erreur lors de la suppression du document");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (documentId: string) => {
    if (!onSetDefaultDocument) return;

    setSettingDefault(documentId);
    try {
      await onSetDefaultDocument(documentId);
      alert("Document défini comme cahier des charges par défaut");
    } catch (error) {
      alert("Erreur lors de la définition du document par défaut");
    } finally {
      setSettingDefault(null);
    }
  };

  const handleChangeDefault = async (documentId: string) => {
    if (!onSetDefaultDocument) return;

    setSettingDefault(documentId);
    try {
      await onSetDefaultDocument(documentId);
      alert("Document cahier des charges changé avec succès");
    } catch (error) {
      alert("Erreur lors du changement du document par défaut");
    } finally {
      setSettingDefault(null);
    }
  };

  const handleDownload = async (doc: RFPDocument) => {
    try {
      // Create download URL - this would need an API endpoint to serve the file
      const response = await fetch(
        `/api/rfps/${rfpId}/documents/${doc.id}/download`
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.original_filename || doc.filename;

      // Trigger download
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Erreur lors du téléchargement du document");
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
          Commencez par ajouter des documents PDF, Excel, Word ou Fichiers texte
        </p>
      </div>
    );
  }

  const documentGroups = groupDocumentsByCategory(documents, supplierNames);

  const renderDocumentCard = (doc: RFPDocument) => (
    <Card key={doc.id} className="p-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            {getFileIcon(
              doc.mime_type,
              doc.original_filename || doc.filename
            )}
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
          {doc.mime_type === "application/pdf" &&
            doc.document_type === "cahier_charges" && (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="text-amber-600 bg-amber-50"
                title="Cahier des charges par défaut"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
          {doc.mime_type === "application/pdf" &&
            doc.document_type === "cahier_charges" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChangeDefault(doc.id)}
                disabled={settingDefault === doc.id}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                title="Changer de cahier des charges par défaut"
              >
                {settingDefault === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </Button>
            )}
          {doc.mime_type === "application/pdf" &&
            doc.document_type !== "cahier_charges" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetDefault(doc.id)}
                disabled={settingDefault === doc.id}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                title="Définir comme cahier des charges par défaut"
              >
                {settingDefault === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(doc)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </Button>
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
  );

  return (
    <>
      <Accordion type="multiple" defaultValue={documentGroups.map((_, i) => `group-${i}`)}>
        {documentGroups.map((group, groupIndex) => (
          <AccordionItem key={`group-${groupIndex}`} value={`group-${groupIndex}`}>
            <AccordionTrigger className="hover:no-underline">
              <span className="text-sm font-semibold text-slate-900">
                {group.title}
              </span>
              <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {group.documents.length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {group.documents.map((doc) => renderDocumentCard(doc))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* PDF Viewer Sheet */}
      <PDFViewerSheet
        isOpen={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        documents={documents}
        rfpId={rfpId}
      />
    </>
  );
}
