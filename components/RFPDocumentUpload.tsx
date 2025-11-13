"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRFPDocumentUpload } from "@/hooks/useRFPDocumentUpload";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
}

interface RFPDocumentUploadProps {
  rfpId: string;
  onUploadSuccess?: () => void;
}

export function RFPDocumentUpload({
  rfpId,
  onUploadSuccess,
}: RFPDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [documentType, setDocumentType] = useState<"cahier_charges" | "supplier">("cahier_charges");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const { uploadDocument, uploadProgress, removeProgressItem } =
    useRFPDocumentUpload(rfpId);

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch(`/api/rfps/${rfpId}/suppliers`);
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [rfpId]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      // Validate file type - allow PDF, Excel, and Word documents
      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        alert("Only PDF, Excel, and Word files are allowed");
        return;
      }

      // Validate file size (50MB)
      const maxSizeBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert("File size exceeds 50MB limit");
        return;
      }

      // Validate supplier selection if document is from supplier
      if (documentType === "supplier" && !selectedSupplierId) {
        alert("Please select a supplier");
        return;
      }

      // Determine the document type string to send to the API
      // Use 'supplier_response' for supplier documents, not 'supplier_${id}'
      const finalDocumentType = documentType === "supplier" ? "supplier_response" : "cahier_charges";

      // Upload the document
      await uploadDocument(file, finalDocumentType, selectedSupplierId);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Trigger callback
      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess();
        }, 1000);
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Error is already handled in the hook
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Document Type Selector */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Type de document
          </label>
          <Select value={documentType} onValueChange={(value) => {
            setDocumentType(value as "cahier_charges" | "supplier");
            if (value === "cahier_charges") {
              setSelectedSupplierId("");
            }
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cahier_charges">
                Document de consultation (cahier des charges)
              </SelectItem>
              <SelectItem value="supplier" disabled={suppliers.length === 0}>
                Document de fournisseur
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Supplier Selector - only shown when supplier type is selected */}
        {documentType === "supplier" && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Fournisseur
            </label>
            {loadingSuppliers ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement des fournisseurs...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-100 p-3 rounded">
                Aucun fournisseur trouvé. Veuillez d'abord importer des fournisseurs.
              </div>
            ) : (
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xls,.xlsx,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          className="flex flex-col items-center justify-center space-y-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="h-10 w-10 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Glissez-déposez votre document ici
            </p>
            <p className="text-xs text-gray-500">
              ou cliquez pour sélectionner un fichier
            </p>
            <p className="text-xs text-gray-400 mt-2">Max 50MB • PDF, Excel, Word</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((item) => (
            <Card key={item.documentId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {item.status === "error" && (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {(item.status === "uploading" ||
                    item.status === "committing") && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {item.status === "idle" && (
                    <FileUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.filename}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {item.progress}%
                      </span>
                    </div>

                    {item.status === "committing" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enregistrement en cours...
                      </p>
                    )}

                    {item.error && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <p className="text-xs text-red-600">{item.error}</p>
                      </div>
                    )}
                  </div>
                </div>

                {item.status === "success" || item.status === "error" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProgressItem(item.documentId)}
                  >
                    ✕
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
