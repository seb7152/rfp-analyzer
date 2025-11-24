"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRFPDocumentUpload } from "@/hooks/useRFPDocumentUpload";
import { cn } from "@/lib/utils";

interface TemplateUploadProps {
  rfpId: string;
  onTemplateUploaded?: () => void;
}

export function TemplateUpload({
  rfpId,
  onTemplateUploaded,
}: TemplateUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { uploadDocument, uploadProgress, removeProgressItem } =
    useRFPDocumentUpload(rfpId);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleTemplateUpload(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleTemplateUpload(files);
    }
  };

  const handleTemplateUpload = async (files: File[]) => {
    // Validate all files before starting any upload
    for (const file of files) {
      // Validate file type - only Excel files
      const allowedMimeTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        alert(
          `Le fichier "${file.name}" n'est pas un fichier Excel valide. Seuls les fichiers .xls et .xlsx sont acceptés.`
        );
        return;
      }

      // Validate file size (50MB)
      const maxSizeBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert(`Le fichier "${file.name}" dépasse la limite de 50MB.`);
        return;
      }
    }

    // Upload all files as templates
    try {
      for (const file of files) {
        await uploadDocument(file, "template");
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Trigger callback after all uploads are initiated
      if (onTemplateUploaded) {
        setTimeout(() => {
          onTemplateUploaded();
        }, 1000);
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Error is already handled in hook
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
          dragActive
            ? "border-green-500 bg-green-50"
            : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          className="flex flex-col items-center justify-center space-y-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet className="h-10 w-10 text-green-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Glissez-déposez vos templates Excel ici
            </p>
            <p className="text-xs text-gray-500">
              ou cliquez pour sélectionner un ou plusieurs fichiers
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Max 50MB par fichier • .xls et .xlsx uniquement
            </p>
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
                    <FileSpreadsheet className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.filename}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {item.progress}%
                      </span>
                    </div>

                    {item.status === "committing" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enregistrement du template...
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
