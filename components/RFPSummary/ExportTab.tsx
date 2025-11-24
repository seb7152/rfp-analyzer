"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateUpload } from "./TemplateUpload";
import { ExportConfigurationList } from "./ExportConfigurationList";
import { ColumnMappingEditor } from "./ColumnMappingEditor";
import { ExportPreview } from "./ExportPreview";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Settings, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  created_at: string;
}

interface ExportConfiguration {
  id: string;
  template_document_id: string;
  worksheet_name: string;
  supplier_id: string;
  column_mappings: any[];
  use_requirement_mapping: boolean;
  requirement_mapping_column?: string;
}

interface Supplier {
  id: string;
  name: string;
}

export function ExportTab({ rfpId }: { rfpId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [exportConfigurations, setExportConfigurations] = useState<
    ExportConfiguration[]
  >([]);
  const [selectedConfiguration, setSelectedConfiguration] =
    useState<ExportConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch templates
        const templatesResponse = await fetch(
          `/api/rfps/${rfpId}/documents?documentType=template`
        );
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData.documents || []);
        }

        // Fetch suppliers
        const suppliersResponse = await fetch(`/api/rfps/${rfpId}/suppliers`);
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData.suppliers || []);
        }

        // Fetch export configurations
        const configResponse = await fetch(
          `/api/rfps/${rfpId}/export-configurations`
        );
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setExportConfigurations(configData.configurations || []);
        }
      } catch (error) {
        console.error("Error fetching export data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for configuration selection events
    const handleConfigurationSelect = (event: CustomEvent) => {
      setSelectedConfiguration(event.detail);
      setActiveTab("mapping");
    };

    if (rfpId) {
      fetchData();
      window.addEventListener(
        "selectConfiguration",
        handleConfigurationSelect as EventListener
      );
    }

    return () => {
      window.removeEventListener(
        "selectConfiguration",
        handleConfigurationSelect as EventListener
      );
    };
  }, [rfpId]);

  const handleTemplateUploaded = () => {
    // Refresh templates list
    fetch(`/api/rfps/${rfpId}/documents?documentType=template`)
      .then((res) => res.json())
      .then((data) => setTemplates(data.documents || []))
      .catch(console.error);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Export Excel
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configurez et générez des exports Excel personnalisés pour vos
            analyses RFP
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="configurations"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurations
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Mapping
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Aperçu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Upload de Templates Excel
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Uploadez vos fichiers Excel templates qui serviront de base
                  pour l'export des données d'analyse.
                </p>
              </div>

              <TemplateUpload
                rfpId={rfpId}
                onTemplateUploaded={handleTemplateUploaded}
              />
            </div>
          </Card>

          {/* Templates List */}
          {templates.length > 0 && (
            <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Templates disponibles ({templates.length})
                </h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {template.original_filename}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(template.file_size / 1024 / 1024).toFixed(2)} MB •
                            {new Date(template.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="configurations" className="space-y-6">
          <ExportConfigurationList
            rfpId={rfpId}
            configurations={exportConfigurations}
            suppliers={suppliers}
            templates={templates}
          />
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          {selectedConfiguration ? (
            <ColumnMappingEditor
              rfpId={rfpId}
              configuration={selectedConfiguration}
              onConfigurationUpdate={(updatedConfig: any) => {
                setSelectedConfiguration(updatedConfig);
                // Refresh configurations list
                fetch(`/api/rfps/${rfpId}/export-configurations`)
                  .then((res) => res.json())
                  .then((data) =>
                    setExportConfigurations(data.configurations || [])
                  )
                  .catch(console.error);
              }}
            />
          ) : (
            <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  Sélectionnez une configuration dans l'onglet "Configurations"
                  pour éditer le mapping des colonnes.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {selectedConfiguration ? (
            <ExportPreview
              rfpId={rfpId}
              configuration={selectedConfiguration}
            />
          ) : (
            <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  Sélectionnez une configuration dans l'onglet "Configurations"
                  pour prévisualiser l'export.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
