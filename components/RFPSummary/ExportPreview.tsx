"use client";

import { useState, useEffect } from "react";
import { useVersion } from "@/contexts/VersionContext";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  siblingConfigurations?: ExportConfiguration[];
  allConfigurationsForTemplate?: ExportConfiguration[];
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRequirements: number;
  supplierName: string;
  templateName: string;
}

export function ExportPreview({
  rfpId,
  configuration,
  allConfigurationsForTemplate = [],
}: ExportPreviewProps) {
  const { activeVersion } = useVersion();
  const [activeConfig, setActiveConfig] =
    useState<ExportConfiguration>(configuration);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all configurations for this template (for generating complete export)
  const configsForTemplate =
    allConfigurationsForTemplate.length > 0
      ? allConfigurationsForTemplate
      : [configuration];

  // Update active config when the main configuration prop changes
  useEffect(() => {
    setActiveConfig(configuration);
  }, [configuration]);

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
            configuration: activeConfig,
            limit: 10, // Preview first 10 rows
            ...(activeVersion?.id && { versionId: activeVersion.id }),
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

    if (activeConfig) {
      fetchPreview();
    }
  }, [rfpId, activeConfig, activeVersion?.id]);

  const handleGenerateExport = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/rfps/${rfpId}/export/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuration: activeConfig, // Can be any config from the group
          ...(activeVersion?.id && { versionId: activeVersion.id }),
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

  if (loading && !previewData) {
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
              Prévisualisation pour {previewData.supplierName} •{" "}
              {previewData.templateName}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleGenerateExport}
            disabled={loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? "Génération..." : "Générer l'Export Complet"}
          </Button>
          <span className="text-xs text-slate-500">
            Inclut tous les onglets configurés
          </span>
        </div>
      </div>

      {/* Tab Navigation for All Configurations in Template */}
      {configsForTemplate.length > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Aperçu des onglets ({configsForTemplate.length} au total)
          </p>
          <Tabs
            value={activeConfig.id}
            onValueChange={(value) => {
              const config = configsForTemplate.find((c) => c.id === value);
              if (config) setActiveConfig(config);
            }}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              {configsForTemplate.map((config) => (
                <TabsTrigger
                  key={config.id}
                  value={config.id}
                  className="text-xs sm:text-sm"
                >
                  <span>{config.worksheet_name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

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

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
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
          )}

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
                Fournisseur (aperçu):
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {previewData.supplierName}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Onglet (aperçu):
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300">
                {activeConfig.worksheet_name}
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

          {configsForTemplate.length > 1 && (
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                ✓ Export multi-onglets activé
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                Le fichier généré inclura {configsForTemplate.length} onglet
                {configsForTemplate.length > 1 ? "s" : ""}:
              </p>
              <div className="flex flex-wrap gap-2">
                {configsForTemplate.map((config) => (
                  <span
                    key={config.id}
                    className="inline-block px-2 py-1 bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100 rounded text-xs font-medium"
                  >
                    {config.worksheet_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeConfig.use_requirement_mapping && (
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Mapping par code exigence activé</strong> - Les données
                seront positionnées sur les lignes correspondantes aux codes
                d'exigences dans la colonne "
                {activeConfig.requirement_mapping_column}"
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
