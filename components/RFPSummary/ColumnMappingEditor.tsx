"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowUpDown, Save } from "lucide-react";

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
  preserve_template_formatting?: boolean;
}

interface ColumnMappingEditorProps {
  rfpId: string;
  configuration: ExportConfiguration;
  onConfigurationUpdate?: (updatedConfig: ExportConfiguration) => void;
}

// Champs disponibles pour l'export
const EXPORT_FIELDS = [
  {
    value: "requirement_code",
    label: "Code Exigence",
    description: "REQ-001, CAT-1.1, etc.",
  },
  {
    value: "requirement_title",
    label: "Titre Exigence",
    description: "Titre de l'exigence",
  },
  {
    value: "requirement_description",
    label: "Description Exigence",
    description: "Description détaillée",
  },
  {
    value: "requirement_weight",
    label: "Poids",
    description: "Pondération de l'exigence",
  },
  {
    value: "requirement_weight_local_percent",
    label: "Poids Local %",
    description: "Poids en % au sein de la catégorie (ex: 30.5%)",
  },
  {
    value: "supplier_response",
    label: "Réponse Fournisseur",
    description: "Texte de la réponse",
  },
  {
    value: "ai_score",
    label: "Note IA",
    description: "Score généré par l'IA (0-5)",
  },
  {
    value: "manual_score",
    label: "Note Manuel",
    description: "Score ajusté manuellement (0-5)",
  },
  {
    value: "smart_score",
    label: "Note Intelligent",
    description: "Note manuel si disponible, sinon note IA (0-5)",
  },
  {
    value: "ai_comment",
    label: "Commentaire IA",
    description: "Analyse et commentaire IA",
  },
  {
    value: "manual_comment",
    label: "Commentaire Manuel",
    description: "Commentaires de l'évaluateur",
  },
  {
    value: "smart_comment",
    label: "Commentaire Intelligent",
    description: "Commentaire manuel si disponible, sinon commentaire IA",
  },
  {
    value: "question",
    label: "Questions / Doutes",
    description: "Questions et doutes de l'évaluateur",
  },
  {
    value: "status",
    label: "Status",
    description: "Pass/Partial/Fail/Pending",
  },
  {
    value: "annotations",
    label: "Annotations",
    description: "Signets et notes du PDF",
  },
];

// Colonnes Excel standards
const EXCEL_COLUMNS = Array.from({ length: 26 }, (_, i) => ({
  value: String.fromCharCode(65 + i), // A, B, C, ..., Z
  label: String.fromCharCode(65 + i),
}));

export function ColumnMappingEditor({
  rfpId,
  configuration,
  onConfigurationUpdate,
}: ColumnMappingEditorProps) {
  const [, forceUpdate] = useState({});
  const [columnMappings, setColumnMappings] = useState(
    configuration.column_mappings || []
  );
  const [useRequirementMapping, setUseRequirementMapping] = useState(
    configuration.use_requirement_mapping || false
  );
  const [requirementMappingColumn, setRequirementMappingColumn] = useState(
    configuration.requirement_mapping_column || ""
  );
  const [startRow, setStartRow] = useState(configuration.start_row || 2);
  const [includeHeaders, setIncludeHeaders] = useState(
    configuration.include_headers !== false // true by default
  );
  const [preserveTemplateFormatting, setPreserveTemplateFormatting] = useState(
    configuration.preserve_template_formatting || false
  );
  const [saving, setSaving] = useState(false);

  const addColumnMapping = () => {
    setColumnMappings([
      ...columnMappings,
      {
        id: `mapping-${Date.now()}`,
        column: "",
        field: "",
        header_name: "",
      },
    ]);
  };

  const removeColumnMapping = (id: string) => {
    setColumnMappings(columnMappings.filter((mapping) => mapping.id !== id));
  };

  const updateColumnMapping = (id: string, updates: any) => {
    setColumnMappings(
      columnMappings.map((mapping) =>
        mapping.id === id ? { ...mapping, ...updates } : mapping
      )
    );
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      // 1. Fetch all configurations to find siblings
      const configsResponse = await fetch(
        `/api/rfps/${rfpId}/export-configurations`
      );
      if (!configsResponse.ok)
        throw new Error("Failed to fetch configurations");

      const configsData = await configsResponse.json();
      const allConfigs: ExportConfiguration[] =
        configsData.configurations || [];

      // 2. Filter configs for the same template
      const templateConfigs = allConfigs.filter(
        (c) => c.template_document_id === configuration.template_document_id
      );

      // 3. Update all matching configurations
      const updatePromises = templateConfigs.map((config) => {
        const updatedConfig = {
          ...config,
          column_mappings: columnMappings,
          use_requirement_mapping: useRequirementMapping,
          requirement_mapping_column: requirementMappingColumn,
          start_row: startRow,
          include_headers: includeHeaders,
          preserve_template_formatting: preserveTemplateFormatting,
        };

        return fetch(`/api/rfps/${rfpId}/export-configurations/${config.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedConfig),
        });
      });

      await Promise.all(updatePromises);

      forceUpdate({});
      if (onConfigurationUpdate) {
        // Pass the updated current configuration back
        const updatedCurrentConfig = {
          ...configuration,
          column_mappings: columnMappings,
          use_requirement_mapping: useRequirementMapping,
          requirement_mapping_column: requirementMappingColumn,
          start_row: startRow,
          include_headers: includeHeaders,
          preserve_template_formatting: preserveTemplateFormatting,
        };
        onConfigurationUpdate(updatedCurrentConfig);
      }
      alert("Configuration sauvegardée pour tous les onglets du modèle !");
    } catch (error) {
      console.error("Error saving configuration:", error);
      alert("Erreur lors de la sauvegarde de la configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Mapping des Colonnes
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configurez quelles données exporter dans quelles colonnes Excel
          </p>
        </div>

        <Button onClick={saveConfiguration} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>

      {/* Export Options */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">
              Options d&apos;Export
            </h4>

            {/* Preserve Template Formatting */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-template-formatting"
                  checked={preserveTemplateFormatting}
                  onCheckedChange={(checked) =>
                    setPreserveTemplateFormatting(checked as boolean)
                  }
                />
                <Label
                  htmlFor="preserve-template-formatting"
                  className="text-sm font-medium"
                >
                  Préserver le formatage du template
                </Label>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Si coché, conserve le formatage, les formules et la structure du
                fichier template. Sinon, crée un fichier Excel vierge avec
                uniquement les données.
              </p>
            </div>

            {/* Include Headers */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-headers"
                  checked={includeHeaders}
                  onCheckedChange={(checked) =>
                    setIncludeHeaders(checked as boolean)
                  }
                />
                <Label
                  htmlFor="include-headers"
                  className="text-sm font-medium"
                >
                  Inclure les en-têtes personnalisés
                </Label>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Si coché, ajoute une ligne d&apos;en-tête avec les noms
                personnalisés des colonnes
              </p>
            </div>

            {/* Start Row */}
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-medium">Ligne de départ</Label>
              <Input
                type="number"
                min="1"
                value={startRow}
                onChange={(e) => setStartRow(parseInt(e.target.value) || 2)}
                placeholder="2"
                className="w-full"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Numéro de la ligne où commencer l&apos;export des données (par
                défaut : 2)
              </p>
            </div>

            {/* Requirement Mapping Option */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-requirement-mapping"
                  checked={useRequirementMapping}
                  onCheckedChange={(checked) =>
                    setUseRequirementMapping(checked as boolean)
                  }
                />
                <Label
                  htmlFor="use-requirement-mapping"
                  className="text-sm font-medium"
                >
                  Utiliser le code exigence pour mapper les données
                </Label>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Si coché, le système cherchera les codes d&apos;exigences dans
                une colonne spécifique et positionnera les données sur la ligne
                correspondante.
              </p>

              {useRequirementMapping && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Colonne des codes d&apos;exigences
                  </Label>
                  <Select
                    value={requirementMappingColumn}
                    onValueChange={setRequirementMappingColumn}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner la colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCEL_COLUMNS.map((column) => (
                        <SelectItem key={column.value} value={column.value}>
                          Colonne {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Column Mappings */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-slate-900 dark:text-white">
              Mapping des colonnes ({columnMappings.length})
            </h4>
            <Button onClick={addColumnMapping} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une colonne
            </Button>
          </div>

          {columnMappings.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune colonne mappée</p>
              <p className="text-sm mt-2">
                Ajoutez des colonnes pour configurer votre export Excel
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {columnMappings.map((mapping, index) => (
                <div
                  key={mapping.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg dark:border-slate-700"
                >
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8">
                    {index + 1}.
                  </span>

                  <div className="flex-1 min-w-[140px]">
                    <Select
                      value={mapping.column}
                      onValueChange={(value) =>
                        updateColumnMapping(mapping.id, { column: value })
                      }
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Colonne Excel" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXCEL_COLUMNS.map((column) => (
                          <SelectItem key={column.value} value={column.value}>
                            Colonne {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-slate-400">→</div>

                  <div className="flex-1 min-w-[280px]">
                    <Select
                      value={mapping.field}
                      onValueChange={(value) =>
                        updateColumnMapping(mapping.id, { field: value })
                      }
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Donnée à exporter">
                          {mapping.field &&
                            EXPORT_FIELDS.find((f) => f.value === mapping.field)
                              ?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {EXPORT_FIELDS.map((field) => (
                          <SelectItem
                            key={field.value}
                            value={field.value}
                            className="py-2.5"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-sm leading-none">
                                {field.label}
                              </div>
                              <div className="text-xs text-slate-500 leading-tight">
                                {field.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <Input
                      value={mapping.header_name || ""}
                      onChange={(e) =>
                        updateColumnMapping(mapping.id, {
                          header_name: e.target.value,
                        })
                      }
                      placeholder="Nom d'en-tête (optionnel)"
                      className="w-full h-10"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeColumnMapping(mapping.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
