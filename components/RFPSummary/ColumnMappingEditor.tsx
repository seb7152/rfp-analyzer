"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
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
    value: "supplier_response",
    label: "Réponse Fournisseur",
    description: "Texte de la réponse",
  },
  {
    value: "ai_score",
    label: "Score IA",
    description: "Score généré par l'IA (0-5)",
  },
  {
    value: "manual_score",
    label: "Score Manuel",
    description: "Score ajusté manuellement",
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
    value: "questions_doubts",
    label: "Questions/Doutes",
    description: "Points à clarifier",
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
  const [saving, setSaving] = useState(false);

  const addColumnMapping = () => {
    setColumnMappings([
      ...columnMappings,
      {
        id: `mapping-${Date.now()}`,
        column: "",
        field: "",
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

      const updatedConfig = {
        ...configuration,
        column_mappings: columnMappings,
        use_requirement_mapping: useRequirementMapping,
        requirement_mapping_column: useRequirementMapping
          ? requirementMappingColumn
          : null,
      };

      const response = await fetch(
        `/api/rfps/${rfpId}/export-configurations/${configuration.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedConfig),
        }
      );

      if (response.ok) {
        const result = await response.json();
        forceUpdate({});
        if (onConfigurationUpdate) {
          onConfigurationUpdate(result.configuration || updatedConfig);
        }
        alert("Configuration sauvegardée avec succès !");
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
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

      {/* Requirement Mapping Option */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Toggle
              id="use-requirement-mapping"
              pressed={useRequirementMapping}
              onPressedChange={setUseRequirementMapping}
            />
            <Label
              htmlFor="use-requirement-mapping"
              className="text-sm font-medium"
            >
              Utiliser le code exigence pour mapper les données
            </Label>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Si coché, le système cherchera les codes d'exigences dans une
            colonne spécifique et positionnera les données sur la ligne
            correspondante.
          </p>

          {useRequirementMapping && (
            <div className="mt-4">
              <Label className="text-sm font-medium mb-2 block">
                Colonne des codes d'exigences
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

                  <div className="flex-1">
                    <Select
                      value={mapping.column}
                      onValueChange={(value) =>
                        updateColumnMapping(mapping.id, { column: value })
                      }
                    >
                      <SelectTrigger>
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

                  <div className="flex-1">
                    <Select
                      value={mapping.field}
                      onValueChange={(value) =>
                        updateColumnMapping(mapping.id, { field: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Donnée à exporter" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPORT_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            <div>
                              <div className="font-medium">{field.label}</div>
                              <div className="text-xs text-slate-500">
                                {field.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

      {/* Instructions */}
      <Card className="rounded-2xl border border-blue-200 bg-blue-50/90 shadow-sm dark:border-blue-800 dark:bg-blue-900/60 p-6">
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-blue-900 dark:text-blue-100">
            💡 Instructions
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li>
              • Associez chaque colonne Excel à une donnée spécifique à exporter
            </li>
            <li>
              • L'ordre des colonnes déterminera l'ordre dans l'Excel final
            </li>
            <li>
              • Si vous utilisez le mapping par code exigence, assurez-vous que
              la colonne contient bien les codes (REQ-001, etc.)
            </li>
            <li>• Les champs non mappés ne seront pas inclus dans l'export</li>
            <li>
              • Vous pouvez mapper plusieurs fois la même donnée dans
              différentes colonnes
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
