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
import { Plus, Edit2, Trash2, FileSpreadsheet, Building2, Loader } from "lucide-react";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({
    template_document_id: "",
    worksheet_name: "",
    supplier_id: "",
  });
  const [availableWorksheets, setAvailableWorksheets] = useState<string[]>([]);
  const [loadingWorksheets, setLoadingWorksheets] = useState(false);
  const [worksheetError, setWorksheetError] = useState<string | null>(null);

  const handleCreateConfiguration = async () => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/export-configurations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newConfig,
          column_mappings: [],
          use_requirement_mapping: false,
        }),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setNewConfig({
          template_document_id: "",
          worksheet_name: "",
          supplier_id: "",
        });
        // Refresh configurations list
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette configuration ?")) {
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
        // Refresh configurations list
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

  const handleTemplateChange = async (templateId: string) => {
    setNewConfig({
      ...newConfig,
      template_document_id: templateId,
      worksheet_name: "", // Reset worksheet selection
    });
    setAvailableWorksheets([]);
    setWorksheetError(null);

    if (!templateId) {
      return;
    }

    setLoadingWorksheets(true);
    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/documents/${templateId}/worksheets`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableWorksheets(data.worksheets || []);
        setWorksheetError(null);
      } else {
        const error = await response.json();
        setWorksheetError(
          error.error || "Impossible de charger les onglets du fichier"
        );
        setAvailableWorksheets([]);
      }
    } catch (error) {
      console.error("Error fetching worksheets:", error);
      setWorksheetError("Erreur lors de la récupération des onglets");
      setAvailableWorksheets([]);
    } finally {
      setLoadingWorksheets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Configurations d'Export
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Associez des templates Excel avec des fournisseurs pour générer des
            exports personnalisés
          </p>
        </div>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              // Reset state when closing
              setNewConfig({
                template_document_id: "",
                worksheet_name: "",
                supplier_id: "",
              });
              setAvailableWorksheets([]);
              setWorksheetError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle Configuration d'Export</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Template Excel
                </label>
                <Select
                  value={newConfig.template_document_id}
                  onValueChange={handleTemplateChange}
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
                  Nom de l'onglet (Worksheet)
                </label>
                {worksheetError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {worksheetError}
                  </div>
                )}
                <Select
                  value={newConfig.worksheet_name}
                  onValueChange={(value) =>
                    setNewConfig({
                      ...newConfig,
                      worksheet_name: value,
                    })
                  }
                  disabled={
                    loadingWorksheets ||
                    !newConfig.template_document_id ||
                    availableWorksheets.length === 0
                  }
                >
                  <SelectTrigger>
                    {loadingWorksheets ? (
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Chargement des onglets...</span>
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
                {!newConfig.template_document_id && (
                  <p className="text-xs text-slate-500 mt-2">
                    Sélectionnez d'abord un template
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Fournisseur
                </label>
                <Select
                  value={newConfig.supplier_id}
                  onValueChange={(value) =>
                    setNewConfig({ ...newConfig, supplier_id: value })
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
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateConfiguration}
                  disabled={
                    !newConfig.template_document_id ||
                    !newConfig.worksheet_name ||
                    !newConfig.supplier_id
                  }
                  className="flex-1"
                >
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configurations List */}
      {configurations.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Aucune configuration d'export
            </p>
            <p className="text-sm">
              Créez votre première configuration pour commencer à exporter vos
              données vers Excel.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {configurations.map((config) => (
            <Card
              key={config.id}
              className="rounded-xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getTemplateName(config.template_document_id)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Onglet:{" "}
                        <span className="font-mono">
                          {config.worksheet_name}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getSupplierName(config.supplier_id)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {config.column_mappings.length} colonnes mappées
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This will be handled by the parent component
                      const event = new CustomEvent("selectConfiguration", {
                        detail: config,
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Éditer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteConfiguration(config.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
