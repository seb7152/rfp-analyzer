"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRFPDocumentUpload } from "@/hooks/useRFPDocumentUpload";
import { cn } from "@/lib/utils";

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

      await uploadDocument(file, "cahier_charges");

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
