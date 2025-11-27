"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Building2,
  Loader,
} from "lucide-react";

interface Template {
  id: string;
  filename: string;
  original_filename: string;
}

interface Supplier {
  id: string;
  name: string;
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

interface ExportConfigurationListProps {
  rfpId: string;
  configurations: ExportConfiguration[];
  suppliers: Supplier[];
  templates: Template[];
  onConfigurationChange?: () => void;
}

export function ExportConfigurationList({
  rfpId,
  configurations,
  suppliers,
  templates,
  onConfigurationChange,
}: ExportConfigurationListProps) {
  const [isAddTabDialogOpen, setIsAddTabDialogOpen] = useState(false);
  const [selectedTemplateForAdd, setSelectedTemplateForAdd] = useState<
    string | null
  >(null);
  const [newTabConfig, setNewTabConfig] = useState({
    worksheet_name: "",
    supplier_id: "",
  });
  const [availableWorksheets, setAvailableWorksheets] = useState<string[]>([]);
  const [loadingWorksheets, setLoadingWorksheets] = useState(false);
  const [worksheetError, setWorksheetError] = useState<string | null>(null);

  // Group configurations by template
  const groupedConfigurations = configurations.reduce(
    (acc, config) => {
      if (!acc[config.template_document_id]) {
        acc[config.template_document_id] = [];
      }
      acc[config.template_document_id].push(config);
      return acc;
    },
    {} as Record<string, ExportConfiguration[]>
  );

  // Get templates that have configurations
  const activeTemplateIds = Object.keys(groupedConfigurations);

  // Get templates that don't have any configuration yet
  const unusedTemplates = templates.filter(
    (t) => !activeTemplateIds.includes(t.id)
  );

  const handleAddTab = async () => {
    if (!selectedTemplateForAdd) return;

    try {
      // Check if there are existing configs for this template to inherit mapping from
      const existingConfigs =
        groupedConfigurations[selectedTemplateForAdd] || [];
      const inheritedMapping =
        existingConfigs.length > 0 ? existingConfigs[0].column_mappings : [];
      const inheritedUseReqMapping =
        existingConfigs.length > 0
          ? existingConfigs[0].use_requirement_mapping
          : false;
      const inheritedReqMappingCol =
        existingConfigs.length > 0
          ? existingConfigs[0].requirement_mapping_column
          : undefined;

      const response = await fetch(`/api/rfps/${rfpId}/export-configurations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_document_id: selectedTemplateForAdd,
          ...newTabConfig,
          column_mappings: inheritedMapping,
          use_requirement_mapping: inheritedUseReqMapping,
          requirement_mapping_column: inheritedReqMappingCol,
        }),
      });

      if (response.ok) {
        setIsAddTabDialogOpen(false);
        setNewTabConfig({
          worksheet_name: "",
          supplier_id: "",
        });
        setSelectedTemplateForAdd(null);
        if (onConfigurationChange) {
          onConfigurationChange();
        }
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error("Error creating configuration:", error);
      alert("Erreur lors de la création de la configuration");
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet onglet ?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/export-configurations/${configId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        if (onConfigurationChange) {
          onConfigurationChange();
        }
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting configuration:", error);
      alert("Erreur lors de la suppression de la configuration");
    }
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    return template?.original_filename || "Template inconnu";
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.name || "Fournisseur inconnu";
  };

  const loadWorksheets = async (templateId: string) => {
    setLoadingWorksheets(true);
    setAvailableWorksheets([]);
    setWorksheetError(null);

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/documents/${templateId}/worksheets`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableWorksheets(data.worksheets || []);
      } else {
        const error = await response.json();
        setWorksheetError(
          error.error || "Impossible de charger les onglets du fichier"
        );
      }
    } catch (error) {
      console.error("Error fetching worksheets:", error);
      setWorksheetError("Erreur lors de la récupération des onglets");
    } finally {
      setLoadingWorksheets(false);
    }
  };

  const openAddTabDialog = (templateId: string) => {
    setSelectedTemplateForAdd(templateId);
    loadWorksheets(templateId);
    setIsAddTabDialogOpen(true);
  };

  const handleEditMapping = (templateId: string) => {
    // Find the first config for this template to use as reference
    const config = groupedConfigurations[templateId]?.[0];
    if (config) {
      const event = new CustomEvent("selectConfiguration", {
        detail: config,
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Fichiers d'Export Configurés
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gérez vos templates et les onglets associés aux fournisseurs
          </p>
        </div>

        {/* Dialog for adding a new tab/template */}
        <Dialog
          open={isAddTabDialogOpen}
          onOpenChange={(open) => {
            setIsAddTabDialogOpen(open);
            if (!open) {
              setNewTabConfig({
                worksheet_name: "",
                supplier_id: "",
              });
              setSelectedTemplateForAdd(null);
              setAvailableWorksheets([]);
              setWorksheetError(null);
            }
          }}
        >
          {unusedTemplates.length > 0 && (
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  // Pre-select the first unused template if available
                  if (unusedTemplates.length > 0) {
                    setSelectedTemplateForAdd(unusedTemplates[0].id);
                    loadWorksheets(unusedTemplates[0].id);
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                Nouveau Fichier
              </Button>
            </DialogTrigger>
          )}

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {groupedConfigurations[selectedTemplateForAdd || ""]
                  ? "Ajouter un onglet au fichier"
                  : "Configurer un nouveau fichier"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Fichier Template
                </label>
                <Select
                  value={selectedTemplateForAdd || ""}
                  onValueChange={(value) => {
                    setSelectedTemplateForAdd(value);
                    loadWorksheets(value);
                  }}
                  disabled={
                    !!groupedConfigurations[selectedTemplateForAdd || ""] &&
                    groupedConfigurations[selectedTemplateForAdd || ""].length >
                      0
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          {template.original_filename}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Onglet (Worksheet)
                </label>
                {worksheetError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {worksheetError}
                  </div>
                )}
                <Select
                  value={newTabConfig.worksheet_name}
                  onValueChange={(value) =>
                    setNewTabConfig({
                      ...newTabConfig,
                      worksheet_name: value,
                    })
                  }
                  disabled={loadingWorksheets || !selectedTemplateForAdd}
                >
                  <SelectTrigger>
                    {loadingWorksheets ? (
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Chargement...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Sélectionner un onglet" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorksheets.map((worksheet) => (
                      <SelectItem key={worksheet} value={worksheet}>
                        {worksheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Fournisseur
                </label>
                <Select
                  value={newTabConfig.supplier_id}
                  onValueChange={(value) =>
                    setNewTabConfig({ ...newTabConfig, supplier_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {supplier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddTabDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddTab}
                  disabled={
                    !selectedTemplateForAdd ||
                    !newTabConfig.worksheet_name ||
                    !newTabConfig.supplier_id
                  }
                  className="flex-1"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped Configurations List */}
      {activeTemplateIds.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Aucune configuration d'export
            </p>
            <p className="text-sm">
              Commencez par configurer un fichier template.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeTemplateIds.map((templateId) => {
            const templateConfigs = groupedConfigurations[templateId];
            const templateName = getTemplateName(templateId);

            return (
              <Card
                key={templateId}
                className="rounded-xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden"
              >
                {/* Template Header */}
                <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                      <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {templateName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {templateConfigs.length} onglet
                        {templateConfigs.length > 1 ? "s" : ""} configuré
                        {templateConfigs.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMapping(templateId)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Configurer le format
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openAddTabDialog(templateId)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un onglet
                    </Button>
                  </div>
                </div>

                {/* Tabs List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {templateConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-6">
                        <div className="min-w-[150px]">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Onglet
                          </p>
                          <p className="font-medium text-slate-900 dark:text-white font-mono text-sm">
                            {config.worksheet_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-lg">→</span>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Fournisseur
                          </p>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {getSupplierName(config.supplier_id)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConfiguration(config.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
