"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Trash2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface DocxImportModalProps {
  rfpId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractionConfig {
  type: "inline" | "table";
  pattern?: string;
  groupIndex?: number;
  columnIndex?: number;
}

interface RequirementConfig {
  type?: "inline" | "table";
  pattern?: string;
  groupIndex?: number;
  columnIndex?: number;
  codeTemplate?: string;
  titleExtraction?: ExtractionConfig;
  contentExtraction?: ExtractionConfig;
}

interface ParsedRequirement {
  code: string;
  title?: string;
  content?: string;
  contexts?: string[];
}

interface Section {
  level: number;
  title: string;
  content: string[];
  tables: string[][];
  requirements: ParsedRequirement[];
}

interface SavedConfig {
  id: string;
  name: string;
  code_type: string;
  code_pattern: string;
  code_group_index: number;
  code_column_index: number;
  code_template: string;
  title_type?: string;
  title_pattern?: string;
  title_group_index?: number;
  title_column_index?: number;
  content_type?: string;
  content_pattern?: string;
  content_group_index?: number;
  content_column_index?: number;
  enable_title_extraction?: boolean;
  enable_content_extraction?: boolean;
  is_default: boolean;
}

type Step = "config" | "preview" | "importing";

export function DocxImportModal({
  rfpId,
  isOpen,
  onOpenChange,
}: DocxImportModalProps) {
  const [step, setStep] = useState<Step>("config");
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Saved configurations
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [configName, setConfigName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isDefaultConfig, setIsDefaultConfig] = useState(false);

  // Configuration state
  const [codeType, setCodeType] = useState<"inline" | "table">("inline");
  const [codePattern, setCodePattern] = useState("(\\d+)");
  const [codeGroupIndex, setCodeGroupIndex] = useState(1);
  const [codeColumnIndex, setCodeColumnIndex] = useState(0);
  const [codeTemplate, setCodeTemplate] = useState("REQ-$1:padStart(2,0)");

  const [enableTitleExtraction, setEnableTitleExtraction] = useState(true);
  const [titleType, setTitleType] = useState<"inline" | "table">("table");
  const [titlePattern, setTitlePattern] = useState("");
  const [titleGroupIndex, setTitleGroupIndex] = useState(1);
  const [titleColumnIndex, setTitleColumnIndex] = useState(1);

  const [enableContentExtraction, setEnableContentExtraction] = useState(true);
  const [contentType, setContentType] = useState<"inline" | "table">("table");
  const [contentPattern, setContentPattern] = useState("");
  const [contentGroupIndex, setContentGroupIndex] = useState(1);
  const [contentColumnIndex, setContentColumnIndex] = useState(2);

  // Preview state
  const [previewRequirements, setPreviewRequirements] = useState<
    ParsedRequirement[]
  >([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState({
    code: "",
    title: "",
    content: "",
  });

  const [selectedColumns, setSelectedColumns] = useState({
    code: true,
    title: true,
    content: true,
    contexts: true,
  });

  // Load saved configurations on mount
  useEffect(() => {
    if (isOpen && rfpId) {
      loadSavedConfigs();
    }
  }, [isOpen, rfpId]);

  const loadSavedConfigs = async () => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/docx-import-configs`);
      if (response.ok) {
        const data = await response.json();
        setSavedConfigs(data.configs || []);

        // Auto-select default config if exists
        const defaultConfig = data.configs?.find(
          (c: SavedConfig) => c.is_default
        );
        if (defaultConfig) {
          setSelectedConfigId(defaultConfig.id);
          applyConfig(defaultConfig);
        }
      }
    } catch (error) {
      console.error("Error loading configs:", error);
    }
  };

  const applyConfig = (config: SavedConfig) => {
    setCodeType(config.code_type as "inline" | "table");
    setCodePattern(config.code_pattern);
    setCodeGroupIndex(config.code_group_index);
    setCodeColumnIndex(config.code_column_index);
    setCodeTemplate(config.code_template);

    if (config.title_type)
      setTitleType(config.title_type as "inline" | "table");
    if (config.title_pattern !== undefined)
      setTitlePattern(config.title_pattern);
    if (config.title_group_index !== undefined)
      setTitleGroupIndex(config.title_group_index);
    if (config.title_column_index !== undefined)
      setTitleColumnIndex(config.title_column_index);
    if (config.enable_title_extraction !== undefined)
      setEnableTitleExtraction(config.enable_title_extraction);

    if (config.content_type)
      setContentType(config.content_type as "inline" | "table");
    if (config.content_pattern !== undefined)
      setContentPattern(config.content_pattern);
    if (config.content_group_index !== undefined)
      setContentGroupIndex(config.content_group_index);
    if (config.content_column_index !== undefined)
      setContentColumnIndex(config.content_column_index);
    if (config.enable_content_extraction !== undefined)
      setEnableContentExtraction(config.enable_content_extraction);

    setIsDefaultConfig(config.is_default);
  };

  const handleLoadConfig = (configId: string) => {
    setSelectedConfigId(configId);
    const config = savedConfigs.find((c) => c.id === configId);
    if (config) {
      applyConfig(config);
      setConfigName(config.name);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedConfigId) return;

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/docx-import-configs/${selectedConfigId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: configName,
            codeType,
            codePattern,
            codeGroupIndex,
            codeColumnIndex,
            codeTemplate,
            titleType,
            titlePattern,
            titleGroupIndex,
            titleColumnIndex,
            enableTitleExtraction,
            contentType,
            contentPattern,
            contentGroupIndex,
            contentColumnIndex,
            enableContentExtraction,
            isDefault: isDefaultConfig,
          }),
        }
      );

      if (response.ok) {
        await loadSavedConfigs();
        alert("Configuration mise à jour avec succès");
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Update config error:", error);
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      alert("Veuillez entrer un nom pour la configuration");
      return;
    }

    try {
      const response = await fetch(`/api/rfps/${rfpId}/docx-import-configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: configName,
          codeType,
          codePattern,
          codeGroupIndex,
          codeColumnIndex,
          codeTemplate,
          titleType,
          titlePattern,
          titleGroupIndex,
          titleColumnIndex,
          enableTitleExtraction,
          contentType,
          contentPattern,
          contentGroupIndex,
          contentColumnIndex,
          enableContentExtraction,
          isDefault: savedConfigs.length === 0 || isDefaultConfig,
        }),
      });

      if (response.ok) {
        await loadSavedConfigs();
        setShowSaveDialog(false);
        setConfigName("");
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Save config error:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm("Supprimer cette configuration ?")) return;

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/docx-import-configs/${configId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await loadSavedConfigs();
        if (selectedConfigId === configId) {
          setSelectedConfigId("");
        }
      }
    } catch (error) {
      console.error("Delete config error:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const requirementConfig: RequirementConfig = {
        type: codeType,
        pattern: codePattern,
        groupIndex: codeGroupIndex,
        columnIndex: codeColumnIndex,
        codeTemplate: codeTemplate,
      };

      if (enableTitleExtraction && (titlePattern || titleType === "table")) {
        requirementConfig.titleExtraction = {
          type: titleType,
          pattern: titlePattern || undefined,
          groupIndex: titleGroupIndex,
          columnIndex: titleColumnIndex,
        };
      }

      if (
        enableContentExtraction &&
        (contentPattern || contentType === "table")
      ) {
        requirementConfig.contentExtraction = {
          type: contentType,
          pattern: contentPattern || undefined,
          groupIndex: contentGroupIndex,
          columnIndex: contentColumnIndex,
        };
      }

      formData.append("requirementConfig", JSON.stringify(requirementConfig));

      const response = await fetch("/api/extract-docx", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Extraction failed");
      }

      const result = await response.json();

      // Collect all requirements from all sections with context
      const allRequirements: ParsedRequirement[] = [];
      result.structured.forEach((section: Section) => {
        section.requirements.forEach((req) => {
          // Add context from the section's content
          allRequirements.push({
            ...req,
            contexts: section.content.length > 0 ? section.content : undefined,
          });
        });
      });

      setPreviewRequirements(allRequirements);
      setStep("preview");
    } catch (error) {
      console.error("Extraction error:", error);
      alert("Erreur lors de l'extraction du fichier");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleEdit = (index: number) => {
    const req = previewRequirements[index];
    setEditingIndex(index);
    setEditingValue({
      code: req.code,
      title: req.title || "",
      content: req.content || "",
    });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const updated = [...previewRequirements];
    updated[editingIndex] = {
      ...updated[editingIndex],
      code: editingValue.code,
      title: editingValue.title || undefined,
      content: editingValue.content || undefined,
    };

    setPreviewRequirements(updated);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleImport = async () => {
    setStep("importing");

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/requirements/import-docx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirements: previewRequirements,
            options: {
              importCode: selectedColumns.code,
              importTitle: selectedColumns.title,
              importContent: selectedColumns.content,
              importContexts: selectedColumns.contexts,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      await response.json();

      // Close modal and refresh
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Import error:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'import");
      setStep("preview");
    }
  };

  const handleClose = () => {
    // Reset state
    setStep("config");
    setFile(null);
    setPreviewRequirements([]);
    setEditingIndex(null);
    onOpenChange(false);
  };

  const stats = {
    total: previewRequirements.length,
    withTitle: previewRequirements.filter((r) => r.title).length,
    withContent: previewRequirements.filter((r) => r.content).length,
    withContexts: previewRequirements.filter(
      (r) => r.contexts && r.contexts.length > 0
    ).length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer depuis DOCX</DialogTitle>
          <DialogDescription>
            {step === "config" &&
              "Configurez les paramètres d'extraction des exigences"}
            {step === "preview" &&
              "Prévisualisez et éditez les exigences avant import"}
            {step === "importing" && "Import en cours..."}
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-6">
            {/* Saved Configurations */}
            {savedConfigs.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Charger une configuration sauvegardée</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedConfigId}
                          onValueChange={handleLoadConfig}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une configuration" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedConfigs.map((config) => (
                              <SelectItem key={config.id} value={config.id}>
                                {config.name}
                                {config.is_default && " (Par défaut)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedConfigId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfig(selectedConfigId)}
                            title="Supprimer cette configuration"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedConfigId && (
                    <div className="flex items-center space-x-2 mt-4">
                      <Switch
                        id="isDefault"
                        checked={isDefaultConfig}
                        onCheckedChange={setIsDefaultConfig}
                      />
                      <Label htmlFor="isDefault" className="text-xs">
                        Par défaut
                      </Label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Fichier DOCX</Label>
              <Input
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {/* Code Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuration Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type d'extraction</Label>
                    <Select
                      value={codeType}
                      onValueChange={(v: "inline" | "table") => setCodeType(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inline">
                          Inline (paragraphe)
                        </SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pattern Regex</Label>
                    <Input
                      value={codePattern}
                      onChange={(e) => setCodePattern(e.target.value)}
                      placeholder="(\d+)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Groupe de capture</Label>
                    <Input
                      type="number"
                      min="0"
                      value={codeGroupIndex}
                      onChange={(e) =>
                        setCodeGroupIndex(parseInt(e.target.value))
                      }
                    />
                  </div>
                  {codeType === "table" && (
                    <div className="space-y-2">
                      <Label>Index de colonne</Label>
                      <Input
                        type="number"
                        min="0"
                        value={codeColumnIndex}
                        onChange={(e) =>
                          setCodeColumnIndex(parseInt(e.target.value))
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2 col-span-2">
                    <Label>Template de code</Label>
                    <Input
                      value={codeTemplate}
                      onChange={(e) => setCodeTemplate(e.target.value)}
                      placeholder="REQ-$1:padStart(2,0)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisez $1 pour le groupe capturé, suivi de
                      transformations (padStart, toUpperCase, etc.)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Title Configuration */}
            <Card className={!enableTitleExtraction ? "opacity-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Configuration Titre
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTitle"
                    checked={enableTitleExtraction}
                    onCheckedChange={(checked) =>
                      setEnableTitleExtraction(checked as boolean)
                    }
                  />
                  <Label htmlFor="enableTitle" className="text-xs">
                    Activer
                  </Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {enableTitleExtraction && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type d'extraction</Label>
                      <Select
                        value={titleType}
                        onValueChange={(v: "inline" | "table") =>
                          setTitleType(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline">
                            Inline (paragraphe)
                          </SelectItem>
                          <SelectItem value="table">Table</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pattern Regex (optionnel)</Label>
                      <Input
                        value={titlePattern}
                        onChange={(e) => setTitlePattern(e.target.value)}
                        placeholder="Laissez vide pour toute la cellule"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Groupe de capture</Label>
                      <Input
                        type="number"
                        min="0"
                        value={titleGroupIndex}
                        onChange={(e) =>
                          setTitleGroupIndex(parseInt(e.target.value))
                        }
                      />
                    </div>
                    {titleType === "table" && (
                      <div className="space-y-2">
                        <Label>Index de colonne</Label>
                        <Input
                          type="number"
                          min="0"
                          value={titleColumnIndex}
                          onChange={(e) =>
                            setTitleColumnIndex(parseInt(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Configuration */}
            <Card className={!enableContentExtraction ? "opacity-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Configuration Contenu
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableContent"
                    checked={enableContentExtraction}
                    onCheckedChange={(checked) =>
                      setEnableContentExtraction(checked as boolean)
                    }
                  />
                  <Label htmlFor="enableContent" className="text-xs">
                    Activer
                  </Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {enableContentExtraction && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type d'extraction</Label>
                      <Select
                        value={contentType}
                        onValueChange={(v: "inline" | "table") =>
                          setContentType(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline">
                            Inline (paragraphe)
                          </SelectItem>
                          <SelectItem value="table">Table</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pattern Regex (optionnel)</Label>
                      <Input
                        value={contentPattern}
                        onChange={(e) => setContentPattern(e.target.value)}
                        placeholder="Laissez vide pour toute la cellule"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Groupe de capture</Label>
                      <Input
                        type="number"
                        min="0"
                        value={contentGroupIndex}
                        onChange={(e) =>
                          setContentGroupIndex(parseInt(e.target.value))
                        }
                      />
                    </div>
                    {contentType === "table" && (
                      <div className="space-y-2">
                        <Label>Index de colonne</Label>
                        <Input
                          type="number"
                          min="0"
                          value={contentColumnIndex}
                          onChange={(e) =>
                            setContentColumnIndex(parseInt(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TODO Note */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <p className="text-sm text-orange-800">
                  <strong>TODO:</strong> Configuration des niveaux de titre à
                  importer - à définir selon la structure hiérarchique souhaitée
                </p>
              </CardContent>
            </Card>

            {/* Save Config Dialog */}
            {showSaveDialog && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Nom de la configuration</Label>
                    <Input
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      placeholder="Ex: Import cahier des charges"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="saveAsDefault"
                      checked={isDefaultConfig}
                      onCheckedChange={setIsDefaultConfig}
                    />
                    <Label htmlFor="saveAsDefault" className="text-xs">
                      Définir comme configuration par défaut
                    </Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSaveDialog(false);
                        setConfigName("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveConfig}>
                      Sauvegarder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {selectedConfigId
                    ? "Sauvegarder sous..."
                    : "Sauvegarder config"}
                </Button>
                {selectedConfigId && (
                  <Button
                    variant="secondary"
                    onClick={handleUpdateConfig}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Mettre à jour
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={!file || isExtracting}
                  className="gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extraction...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Extraire
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Exigences</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.withTitle}</div>
                  <p className="text-xs text-muted-foreground">Avec titre</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.withContent}</div>
                  <p className="text-xs text-muted-foreground">Avec contenu</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.withContexts}</div>
                  <p className="text-xs text-muted-foreground">
                    Avec contextes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedColumns.code}
                          onChange={(e) =>
                            setSelectedColumns({
                              ...selectedColumns,
                              code: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Code
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedColumns.title}
                          onChange={(e) =>
                            setSelectedColumns({
                              ...selectedColumns,
                              title: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Titre
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedColumns.content}
                          onChange={(e) =>
                            setSelectedColumns({
                              ...selectedColumns,
                              content: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Contenu
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedColumns.contexts}
                          onChange={(e) =>
                            setSelectedColumns({
                              ...selectedColumns,
                              contexts: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Contextes
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRequirements.map((req, index) => (
                    <TableRow key={index}>
                      {editingIndex === index ? (
                        <>
                          <TableCell>
                            <Input
                              value={editingValue.code}
                              onChange={(e) =>
                                setEditingValue({
                                  ...editingValue,
                                  code: e.target.value,
                                })
                              }
                              className="h-8"
                              disabled={!selectedColumns.code}
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={editingValue.title}
                              onChange={(e) =>
                                setEditingValue({
                                  ...editingValue,
                                  title: e.target.value,
                                })
                              }
                              className="min-h-[60px]"
                              disabled={!selectedColumns.title}
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={editingValue.content}
                              onChange={(e) =>
                                setEditingValue({
                                  ...editingValue,
                                  content: e.target.value,
                                })
                              }
                              className="min-h-[60px]"
                              disabled={!selectedColumns.content}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {req.contexts?.length || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                              >
                                ✕
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell
                            className={`font-mono text-sm ${
                              !selectedColumns.code
                                ? "text-muted-foreground opacity-50 bg-muted/50"
                                : ""
                            }`}
                          >
                            {req.code}
                          </TableCell>
                          <TableCell
                            className={`max-w-[300px] truncate ${
                              !selectedColumns.title
                                ? "text-muted-foreground opacity-50 bg-muted/50"
                                : ""
                            }`}
                          >
                            {req.title || (
                              <span className="text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`max-w-[300px] truncate ${
                              !selectedColumns.content
                                ? "text-muted-foreground opacity-50 bg-muted/50"
                                : ""
                            }`}
                          >
                            {req.content || (
                              <span className="text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-center ${
                              !selectedColumns.contexts
                                ? "text-muted-foreground opacity-50 bg-muted/50"
                                : ""
                            }`}
                          >
                            {req.contexts?.length || 0}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                            >
                              Éditer
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("config")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleImport} className="gap-2">
                <Upload className="h-4 w-4" />
                Importer en base
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Import en cours...</p>
            <p className="text-sm text-muted-foreground">
              {stats.total} exigences en cours d'import
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
