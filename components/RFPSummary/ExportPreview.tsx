"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Eye, AlertCircle } from "lucide-react";

interface ExportConfiguration {
  id: string;
  template_document_id: string;
  worksheet_name: string;
  supplier_id: string;
  column_mappings: any[];
  use_requirement_mapping: boolean;
  requirement_mapping_column?: string;
  start_row?: number;
  include_headers?: boolean;
}

interface ExportPreviewProps {
  rfpId: string;
  configuration: ExportConfiguration;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRequirements: number;
  supplierName: string;
  templateName: string;
}

export function ExportPreview({ rfpId, configuration }: ExportPreviewProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/rfps/${rfpId}/export/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            configuration,
            limit: 10, // Preview first 10 rows
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewData(data.preview);
        } else {
          const errorData = await response.json();
          setError(
            errorData.message || "Erreur lors de la génération de l'aperçu"
          );
        }
      } catch (error) {
        console.error("Error fetching preview:", error);
        setError("Erreur lors de la génération de l'aperçu");
      } finally {
        setLoading(false);
      }
    };

    if (configuration) {
      fetchPreview();
    }
  }, [rfpId, configuration]);

  const handleGenerateExport = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/rfps/${rfpId}/export/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuration,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Create download link
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert("Export généré avec succès !");
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error generating export:", error);
      alert("Erreur lors de la génération de l'export");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Génération de l'aperçu...
          </h3>
        </div>
        <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Erreur de prévisualisation
          </h3>
        </div>
        <Card className="rounded-2xl border border-red-200 bg-red-50/90 shadow-sm dark:border-red-800 dark:bg-red-900/60 p-6">
          <div className="text-center text-red-700 dark:text-red-300">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Impossible de générer l'aperçu
            </p>
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Aperçu de l'Export
          </h3>
        </div>
        <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chargement de l'aperçu...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Aperçu de l'Export
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {previewData.supplierName} • {previewData.templateName} •
              {previewData.totalRequirements} exigences au total
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateExport}
          disabled={loading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {loading ? "Génération..." : "Générer l'Export"}
        </Button>
      </div>

      {/* Preview Table */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-slate-900 dark:text-white">
              Aperçu des données (10 premières lignes)
            </h4>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {previewData.rows.length} sur {previewData.totalRequirements}{" "}
              exigences
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    {previewData.headers.map((header, index) => (
                      <TableHead
                        key={index}
                        className="font-medium text-slate-900 dark:text-white"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className="border-b border-slate-100 dark:border-slate-700"
                    >
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className="text-slate-700 dark:text-slate-300"
                        >
                          <div className="max-w-xs truncate" title={cell}>
                            {cell || "-"}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {previewData.totalRequirements > 10 && (
            <div className="text-center text-sm text-slate-600 dark:text-slate-400 pt-4">
              <Eye className="h-4 w-4 inline mr-2" />
              Affichage des 10 premières lignes sur{" "}
              {previewData.totalRequirements} exigences au total
            </div>
          )}
        </div>
      </Card>

      {/* Export Info */}
      <Card className="rounded-2xl border border-blue-200 bg-blue-50/90 shadow-sm dark:border-blue-800 dark:bg-blue-900/60 p-6">
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-blue-900 dark:text-blue-100">
            📋 Informations d'Export
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Template:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {previewData.templateName}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Fournisseur:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {previewData.supplierName}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Onglet:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {configuration.worksheet_name}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Total exigences:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {previewData.totalRequirements}
              </span>
            </div>
          </div>

          {configuration.use_requirement_mapping && (
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Mapping par code exigence activé</strong> - Les données
                seront positionnées sur les lignes correspondantes aux codes
                d'exigences dans la colonne "
                {configuration.requirement_mapping_column}"
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
