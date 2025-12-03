"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RequirementConfig {
  capturePattern?: string;
  codeTemplate?: string;
  captureGroupIndex?: number;
  titleExtraction?: {
    type: "inline" | "table";
    pattern?: string;
    groupIndex?: number;
    columnIndex?: number;
  };
  contentExtraction?: {
    type: "inline" | "table";
    pattern?: string;
    groupIndex?: number;
    columnIndex?: number;
  };
}

interface ExtractedRequirement {
  code: string;
  originalCapture: string;
  title?: string;
  content?: string;
}

interface Section {
  level: number;
  title: string;
  content: string[];
  tables: string[][];
  requirements: ExtractedRequirement[];
}

interface DocxExtractorProps {
  onExtract?: (sections: Section[]) => void;
}

export function DocxExtractor({ onExtract }: DocxExtractorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<RequirementConfig>({});
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      toast.error("Veuillez sélectionner un fichier DOCX");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      if (Object.keys(config).length > 0) {
        formData.append("requirementConfig", JSON.stringify(config));
      }

      const response = await fetch("/api/extract-docx", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de l'extraction");
      }

      const data = await response.json();

      if (data.success && data.structured) {
        toast.success("Document extrait avec succès");
        onExtract?.(data.structured);
      } else {
        throw new Error("Format de réponse invalide");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur d'extraction"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <h3 className="font-semibold">Extraire les Requirements d'un DOCX</h3>
        <p className="text-sm text-gray-600">
          Téléchargez un fichier DOCX pour extraire automatiquement les
          requirements et sections
        </p>
      </div>

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? "Extraction en cours..." : "Sélectionner DOCX"}
        </Button>

        <Button
          onClick={() => setShowConfig(!showConfig)}
          variant="ghost"
          size="sm"
        >
          {showConfig ? "Masquer" : "Config"} Requirements
        </Button>
      </div>

      {showConfig && (
        <div className="space-y-3 p-3 bg-gray-50 rounded border text-sm">
          <div>
            <label className="block font-medium mb-1">
              Pattern de capture (regex):
            </label>
            <input
              type="text"
              placeholder="ex: REQ-([0-9]+)"
              value={config.capturePattern || ""}
              onChange={(e) =>
                setConfig({ ...config, capturePattern: e.target.value })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Template de code (optionnel):
            </label>
            <input
              type="text"
              placeholder="ex: REQ-$1:padStart(2,0)"
              value={config.codeTemplate || ""}
              onChange={(e) =>
                setConfig({ ...config, codeTemplate: e.target.value })
              }
              className="w-full px-2 py-1 border rounded text-xs"
            />
            <p className="text-gray-500 mt-1">
              Transformations: padStart(len,char), toUpperCase(), toLowerCase(),
              replace(pat,rep)
            </p>
          </div>

          <details className="p-2 bg-white rounded">
            <summary className="cursor-pointer font-medium">
              Extraction titre/contenu (avancé)
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              <p className="text-gray-600">
                Optionnel: extraire titre et contenu depuis chaque requirement
              </p>
              {/* Simplified - full config UI would be more complex */}
              <p className="text-gray-500">
                Consultez la documentation pour la configuration avancée
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
