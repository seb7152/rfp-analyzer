"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import "@uiw/react-textarea-code-editor/dist.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";

interface ImportWithStepperProps {
  rfpId: string;
}

const steps = [
  { step: 1, title: "Structure" },
  { step: 2, title: "Exigences" },
  { step: 3, title: "Fournisseurs" },
  { step: 4, title: "Réponses" },
];

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export function ImportWithStepper({ rfpId }: ImportWithStepperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1: Structure
  const [categoriesJson, setCategoriesJson] = useState<string>("");
  const [categoriesValid, setCategoriesValid] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [existingCategoryCodes, setExistingCategoryCodes] = useState<string[]>(
    []
  );

  // Step 2: Requirements
  const [requirementsJson, setRequirementsJson] = useState<string>("");
  const [requirementsValid, setRequirementsValid] = useState(false);
  const [existingRequirements, setExistingRequirements] = useState<string[]>(
    []
  );

  // Step 3: Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState<Supplier>({
    id: "",
    name: "",
  });

  // Step 4: Responses
  const [supplierResponses, setSupplierResponses] = useState<{
    [key: string]: string;
  }>({});
  const [expandedSuppliers, setExpandedSuppliers] = useState<{
    [key: string]: boolean;
  }>({});
  const [responsesImportedBySupplier, setResponsesImportedBySupplier] =
    useState<{ [key: string]: boolean }>({});

  // Load existing categories, requirements, and suppliers at appropriate steps
  useEffect(() => {
    if (currentStep === 2) {
      loadExistingCategories();
    } else if (currentStep === 3) {
      loadExistingSuppliers();
    } else if (currentStep === 4) {
      loadExistingRequirements();
      loadExistingSuppliers(); // Also load suppliers at step 4 for responses import
    }
  }, [currentStep]);

  const loadExistingCategories = async () => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/tree`);
      if (!response.ok) return;

      const treeData = await response.json();
      // Extract all category titles and codes from the tree (including nested ones)
      const titles: string[] = [];
      const codes: string[] = [];

      const extractCategories = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === "category") {
            titles.push(node.title);
            if (node.code) {
              codes.push(node.code);
            }
            if (node.children) {
              extractCategories(
                node.children.filter((c: any) => c.type === "category")
              );
            }
          }
        }
      };

      extractCategories(treeData);
      setExistingCategories(titles);
      setExistingCategoryCodes(codes);
    } catch (err) {
      console.error("Failed to load existing categories:", err);
    }
  };

  const loadExistingRequirements = async () => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/tree`);
      if (!response.ok) return;

      const treeData = await response.json();
      // Extract all requirement codes from the tree
      const codes: string[] = [];

      const extractRequirements = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === "requirement") {
            codes.push(node.code);
          }
          if (node.children) {
            extractRequirements(node.children);
          }
        }
      };

      extractRequirements(treeData);
      setExistingRequirements(codes);
    } catch (err) {
      console.error("Failed to load existing requirements:", err);
    }
  };

  const loadExistingSuppliers = async () => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/suppliers`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.suppliers && data.suppliers.length > 0) {
        // Map database suppliers to our local format
        const existingSuppliers = data.suppliers.map((s: any) => ({
          id: s.supplier_id_external,
          name: s.name,
          contact_name: s.contact_name || undefined,
          contact_email: s.contact_email || undefined,
          contact_phone: s.contact_phone || undefined,
        }));
        setSuppliers(existingSuppliers);
      }
    } catch (err) {
      console.error("Failed to load existing suppliers:", err);
    }
  };

  const validateJSON = (json: string): boolean => {
    if (json.trim() === "") return false;
    try {
      JSON.parse(json.trim());
      return true;
    } catch {
      return false;
    }
  };

  const validateRequirementsJSON = (json: string): boolean => {
    if (json.trim() === "") return false;
    try {
      const data = JSON.parse(json.trim());
      // Accept either direct array or { requirements: [...] }
      const requirements = Array.isArray(data) ? data : data.requirements || [];
      return Array.isArray(requirements) && requirements.length > 0;
    } catch {
      return false;
    }
  };

  const handleJsonChange = (
    value: string,
    setter: Function,
    validSetter: Function
  ) => {
    setter(value);
    validSetter(validateJSON(value));
    setError(null);
    setSuccess(null);
  };

  const handleFormatJSON = (
    json: string,
    setter: Function,
    validSetter: Function
  ) => {
    try {
      const parsed = JSON.parse(json.trim());
      const formatted = JSON.stringify(parsed, null, 2);
      setter(formatted);
      validSetter(true);
      setError(null);
    } catch (err) {
      setError(
        `JSON invalide: ${err instanceof Error ? err.message : "Erreur inconnue"}`
      );
      validSetter(false);
    }
  };

  const handleCopyExample = (example: string) => {
    navigator.clipboard.writeText(example);
  };

  const handleImportStructure = async () => {
    if (!categoriesValid) {
      setError("JSON invalide pour les catégories");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfps/${rfpId}/categories/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: categoriesJson.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess("Structure importée avec succès ✓");
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  const handleImportRequirements = async () => {
    if (!requirementsValid) {
      setError("JSON invalide pour les exigences");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfps/${rfpId}/requirements/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: requirementsJson.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess("Exigences importées avec succès ✓");
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = () => {
    if (!newSupplier.id || !newSupplier.name) {
      setError("Veuillez remplir l'ID et le nom du fournisseur");
      return;
    }
    setSuppliers([...suppliers, newSupplier]);
    setNewSupplier({ id: "", name: "" });
    setError(null);
  };

  const removeSupplier = (index: number) => {
    setSuppliers(suppliers.filter((_, i) => i !== index));
  };

  const handleImportSuppliers = async () => {
    if (suppliers.length === 0) {
      setError("Veuillez ajouter au moins un fournisseur");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfps/${rfpId}/suppliers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppliers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess("Fournisseurs importés avec succès ✓");
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  const validateSupplierJSON = (json: string): boolean => {
    if (json.trim() === "") return false;
    try {
      const parsed = JSON.parse(json.trim());
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  };

  const handleImportSupplierResponses = async (
    supplierId: string,
    json: string
  ) => {
    if (!validateSupplierJSON(json)) {
      setError("JSON invalide pour ce fournisseur");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const responses = JSON.parse(json.trim());
      // Add supplier_id_external to each response
      const responsesWithSupplier = responses.map((r: any) => ({
        ...r,
        supplier_id_external: supplierId,
      }));

      const response = await fetch(`/api/rfps/${rfpId}/responses/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responsesWithSupplier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess(`Réponses de ${supplierId} importées avec succès ✓`);
      setResponsesImportedBySupplier((prev) => ({
        ...prev,
        [supplierId]: true,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      {/* Stepper */}
      <Stepper value={currentStep} className="mb-8">
        {steps.map(({ step, title }) => (
          <StepperItem
            key={step}
            step={step}
            className="relative flex-1 flex-col"
          >
            <StepperTrigger
              onClick={() => setCurrentStep(step)}
              className="flex-col gap-3 rounded cursor-pointer"
            >
              <StepperIndicator />
              <div className="px-2">
                <StepperTitle>{title}</StepperTitle>
              </div>
            </StepperTrigger>
            {step < steps.length && (
              <StepperSeparator
                className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 self-start"
                style={{ marginTop: "0.75rem" }}
              />
            )}
          </StepperItem>
        ))}
      </Stepper>

      {/* Step Content */}
      <Card className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Step 1: Structure */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Importer la structure</h2>
              <p className="text-sm text-slate-600">
                Collez le JSON des catégories (domaines, sous-domaines, etc.)
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 overflow-auto max-h-32">
              <pre>
                {`[
  {
    "id": "DOM1",
    "code": "DOM1",
    "title": "Domaine 1",
    "short_name": "D1",
    "level": 1,
    "parent_id": null
  },
  {
    "id": "DOM1.1",
    "code": "DOM1.1",
    "title": "Sous-domaine",
    "short_name": "SD1",
    "level": 2,
    "parent_id": "DOM1"
  }
]`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyExample(
                    `[{"id":"DOM1","code":"DOM1","title":"Domaine 1","short_name":"D1","level":1,"parent_id":null},{"id":"DOM1.1","code":"DOM1.1","title":"Sous-domaine","short_name":"SD1","level":2,"parent_id":"DOM1"}]`
                  )
                }
                className="mt-2 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copier exemple
              </Button>
            </div>

            <CodeEditor
              value={categoriesJson}
              onChange={(e) =>
                handleJsonChange(
                  e.target.value,
                  setCategoriesJson,
                  setCategoriesValid
                )
              }
              language="json"
              placeholder="Collez votre JSON ici..."
              style={{
                backgroundColor: "#f5f5f5",
                fontFamily: "ui-monospace, Menlo, monospace",
                height: 250,
              }}
              className="rounded border border-slate-300 dark:border-slate-700"
            />

            {/* Preview table for categories */}
            {categoriesValid && categoriesJson.trim() && (
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Aperçu (
                  {(() => {
                    try {
                      return JSON.parse(categoriesJson.trim()).length;
                    } catch {
                      return 0;
                    }
                  })()}
                  )
                </h3>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900">
                        <TableHead>Code</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead className="text-right">Niveau</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        try {
                          const categories = JSON.parse(categoriesJson.trim());
                          return categories.map(
                            (
                              category: {
                                code: string;
                                title: string;
                                level: number;
                                order?: number;
                              },
                              idx: number
                            ) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-xs">
                                  {category.code}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <span
                                    style={{
                                      paddingLeft: `${(category.level - 1) * 1.25}rem`,
                                    }}
                                  >
                                    {category.title}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {category.level}
                                </TableCell>
                              </TableRow>
                            )
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  handleFormatJSON(
                    categoriesJson,
                    setCategoriesJson,
                    setCategoriesValid
                  )
                }
                size="sm"
              >
                Formater JSON
              </Button>
              <Button
                onClick={handleImportStructure}
                disabled={!categoriesValid || loading}
                className="flex-1"
              >
                {loading ? "Import en cours..." : "Importer la structure"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Requirements */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Importer les exigences
              </h2>
              <p className="text-sm text-slate-600">
                Collez le JSON des exigences/besoins. Le champ category_name
                accepte soit le nom complet soit le code de la catégorie.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 overflow-auto max-h-40">
              <pre>
                {`[
  {
    "code": "REQ001",                          // Obligatoire
    "title": "Titre de l'exigence 1",         // Obligatoire
    "description": "Description détaillée",    // Obligatoire
    "weight": 0.8,                             // Obligatoire (0-1)
    "category_name": "Functionnal requirements", // Obligatoire
    "tags": ["Fonctionnel", "Critique"],       // Optionnel: liste de noms de tags
    "is_mandatory": true,                      // Optionnel (défaut: false)
    "is_optional": false,                      // Optionnel (défaut: false)
    "page_number": 5,                          // Optionnel
    "rf_document_id": "uuid-doc-id"            // Optionnel
  },
  {
    "code": "REQ002",
    "title": "Titre de l'exigence 2",
    "description": "Contenu de l'exigence optionnelle",
    "weight": 0.6,
    "category_name": "DOM1",
    "tags": ["UX"],
    "is_mandatory": false,
    "is_optional": true,
    "page_number": 10
  }
]`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyExample(
                    `[{"code":"REQ001","title":"Titre de l'exigence 1","description":"Description détaillée de l'exigence","weight":0.8,"category_name":"Functionnal requirements","tags":["Fonctionnel","Critique"],"is_mandatory":true,"is_optional":false,"page_number":5},{"code":"REQ002","title":"Titre de l'exigence 2","description":"Contenu de l'exigence optionnelle","weight":0.6,"category_name":"DOM1","tags":["UX"],"is_mandatory":false,"is_optional":true,"page_number":10}]`
                  )
                }
                className="mt-2 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copier exemple
              </Button>
            </div>

            <CodeEditor
              value={requirementsJson}
              onChange={(e) => {
                setRequirementsJson(e.target.value);
                setRequirementsValid(validateRequirementsJSON(e.target.value));
                setError(null);
                setSuccess(null);
              }}
              language="json"
              placeholder="Collez votre JSON ici..."
              style={{
                backgroundColor: "#f5f5f5",
                fontFamily: "ui-monospace, Menlo, monospace",
                height: 250,
              }}
              className="rounded border border-slate-300 dark:border-slate-700"
            />

            {/* Preview table for requirements */}
            {requirementsValid && requirementsJson.trim() && (
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Aperçu (
                  {(() => {
                    try {
                      const data = JSON.parse(requirementsJson.trim());
                      const requirements = Array.isArray(data)
                        ? data
                        : data.requirements || [];
                      return requirements.length;
                    } catch {
                      return 0;
                    }
                  })()}
                  )
                </h3>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900">
                        <TableHead>Code</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Poids</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        try {
                          const data = JSON.parse(requirementsJson.trim());
                          // Normalize: accept either direct array or { requirements: [...] }
                          const requirements = Array.isArray(data)
                            ? data
                            : data.requirements || [];
                          return requirements.map(
                            (
                              requirement: {
                                code: string;
                                title: string;
                                category_name: string;
                                weight: number;
                                tags?: string[];
                              },
                              idx: number
                            ) => {
                              const categoryExists =
                                existingCategories.includes(
                                  requirement.category_name
                                ) ||
                                existingCategoryCodes.includes(
                                  requirement.category_name
                                );
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">
                                    {requirement.code}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {requirement.title}
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                      <span>{requirement.category_name}</span>
                                      {categoryExists ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {requirement.tags &&
                                    requirement.tags.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {requirement.tags.map((tag, tagIdx) => (
                                          <span
                                            key={tagIdx}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="inline-flex items-center gap-1 text-sm">
                                      {requirement.weight}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  handleFormatJSON(
                    requirementsJson,
                    setRequirementsJson,
                    setRequirementsValid
                  )
                }
                size="sm"
              >
                Formater JSON
              </Button>
              <Button
                onClick={handleImportRequirements}
                disabled={!requirementsValid || loading}
                className="flex-1"
              >
                {loading ? "Import en cours..." : "Importer les exigences"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(`/dashboard/rfp/${rfpId}/evaluate`)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Aller au RFP →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Suppliers */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Ajouter les fournisseurs</h2>

            {/* Add supplier form */}
            <Card className="p-4 bg-slate-50 dark:bg-slate-900">
              <div className="space-y-3">
                <Input
                  placeholder="ID fournisseur (ex: SUP001)"
                  value={newSupplier.id}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, id: e.target.value })
                  }
                />
                <Input
                  placeholder="Nom du fournisseur"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Nom du contact (optionnel)"
                  value={newSupplier.contact_name || ""}
                  onChange={(e) =>
                    setNewSupplier({
                      ...newSupplier,
                      contact_name: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Email (optionnel)"
                  type="email"
                  value={newSupplier.contact_email || ""}
                  onChange={(e) =>
                    setNewSupplier({
                      ...newSupplier,
                      contact_email: e.target.value,
                    })
                  }
                />
                <Button onClick={addSupplier} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter le fournisseur
                </Button>
              </div>
            </Card>

            {/* Suppliers list as table */}
            {suppliers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Fournisseurs ajoutés ({suppliers.length})
                </h3>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900">
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {supplier.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {supplier.name}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                            {supplier.contact_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                            {supplier.contact_email || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => removeSupplier(idx)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button
              onClick={handleImportSuppliers}
              disabled={loading || suppliers.length === 0}
              className="w-full"
            >
              {loading ? "Import en cours..." : "Importer les fournisseurs"}
            </Button>
          </div>
        )}

        {/* Step 4: Responses */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Importer les réponses</h2>
              <p className="text-sm text-slate-600 mb-3">
                Importez les réponses pour chaque fournisseur
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">💡 Mode UPSERT :</span> Les
                  réponses existantes seront mises à jour avec les champs
                  fournis. Les champs non fournis conserveront leurs valeurs
                  existantes.
                </p>
              </div>
            </div>

            {/* Suppliers table - showing import status */}
            {suppliers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Fournisseurs ({suppliers.length})
                </h3>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900">
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier, idx) => {
                        const isImported =
                          responsesImportedBySupplier[supplier.id] || false;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {supplier.id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {supplier.name}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                              {supplier.contact_name || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                              {supplier.contact_email || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {isImported ? (
                                <div className="flex items-center justify-end gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                    Importé
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  En attente
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Import sections - one per supplier */}
            <div className="space-y-3">
              {suppliers.map((supplier) => {
                const supplierId = supplier.id;
                const isExpanded = expandedSuppliers[supplierId] || false;
                const isImported =
                  responsesImportedBySupplier[supplierId] || false;
                const json = supplierResponses[supplierId] || "";
                const isValid = validateSupplierJSON(json);

                return (
                  <div
                    key={supplierId}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                  >
                    {/* Header - Toggle button */}
                    <button
                      onClick={() =>
                        setExpandedSuppliers((prev) => ({
                          ...prev,
                          [supplierId]: !prev[supplierId],
                        }))
                      }
                      className="w-full px-4 py-3 flex items-center justify-between bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                        {isExpanded ? "▼" : "▶"} {supplier.name}
                      </span>
                      {isImported && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            Importé
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Import form - shown when expanded */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {/* Example JSON */}
                        <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 overflow-auto max-h-52">
                          <pre>
                            {`[
  {
    "requirement_id_external": "REQ001",            // Obligatoire
    "response_text": "Réponse du fournisseur",      // Optionnel
    "ai_score": 4,                                  // Optionnel (0-5 ou 0.5)
    "ai_comment": "Analyse IA...",                  // Optionnel
    "manual_score": 3,                              // Optionnel (0-5 ou 0.5)
    "manual_comment": "Commentaire du relecteur",   // Optionnel
    "question": "Question d'évaluation",            // Optionnel
    "status": "pass",                               // Optionnel (pending, pass, partial, fail)
    "is_checked": true                              // Optionnel (défaut: false)
  },
  {
    "requirement_id_external": "REQ002",
    "response_text": "...",
    "ai_score": 5,
    "ai_comment": "..."
  },
  {
    "requirement_id_external": "REQ003",
    "manual_score": 2,
    "manual_comment": "À améliorer"
  }
]`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopyExample(
                                `[{"requirement_id_external":"REQ001","response_text":"Réponse du fournisseur","ai_score":4,"ai_comment":"Analyse IA...","manual_score":3,"manual_comment":"Commentaire du relecteur","question":"Question d'évaluation","status":"pass","is_checked":true},{"requirement_id_external":"REQ002","response_text":"...","ai_score":5,"ai_comment":"..."},{"requirement_id_external":"REQ003","manual_score":2,"manual_comment":"À améliorer"}]`
                              )
                            }
                            className="mt-2 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copier exemple
                          </Button>
                        </div>

                        {/* JSON Editor */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Réponses pour {supplier.name} :
                          </p>
                          <CodeEditor
                            value={json}
                            onChange={(e) =>
                              setSupplierResponses((prev) => ({
                                ...prev,
                                [supplierId]: e.target.value,
                              }))
                            }
                            language="json"
                            placeholder="Collez votre JSON ici..."
                            style={{
                              backgroundColor: "#f5f5f5",
                              fontFamily: "ui-monospace, Menlo, monospace",
                              height: 200,
                            }}
                            className="rounded border border-slate-300 dark:border-slate-700"
                          />
                        </div>

                        {/* Preview table */}
                        {isValid && json.trim() && (
                          <div className="space-y-3">
                            <h3 className="font-semibold">
                              Aperçu (
                              {(() => {
                                try {
                                  const data = JSON.parse(json.trim());
                                  const responses = Array.isArray(data)
                                    ? data
                                    : data.responses || [];
                                  return responses.length;
                                } catch {
                                  return 0;
                                }
                              })()}
                              )
                            </h3>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                                    <TableHead>Exigence</TableHead>
                                    <TableHead className="text-right">
                                      Score IA
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Score Manuel
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(() => {
                                    try {
                                      const data = JSON.parse(json.trim());
                                      const responses = Array.isArray(data)
                                        ? data
                                        : data.responses || [];
                                      return responses.map(
                                        (
                                          response: {
                                            requirement_id_external: string;
                                            response_text?: string;
                                            ai_score?: number;
                                            manual_score?: number;
                                          },
                                          idx: number
                                        ) => {
                                          const requirementExists =
                                            existingRequirements.includes(
                                              response.requirement_id_external
                                            );
                                          return (
                                            <TableRow key={idx}>
                                              <TableCell className="font-mono text-sm">
                                                <div className="flex items-center gap-2">
                                                  <span>
                                                    {
                                                      response.requirement_id_external
                                                    }
                                                  </span>
                                                  {requirementExists ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                  ) : (
                                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {response.ai_score ? (
                                                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                    {response.ai_score}/5
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">
                                                    —
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {response.manual_score ? (
                                                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                                                    {response.manual_score}/5
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">
                                                    —
                                                  </span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        }
                                      );
                                    } catch {
                                      return null;
                                    }
                                  })()}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              try {
                                const formatted = JSON.stringify(
                                  JSON.parse(json.trim()),
                                  null,
                                  2
                                );
                                setSupplierResponses((prev) => ({
                                  ...prev,
                                  [supplierId]: formatted,
                                }));
                              } catch {
                                setError("JSON invalide");
                              }
                            }}
                            size="sm"
                            disabled={!isValid}
                          >
                            Formater JSON
                          </Button>
                          <Button
                            onClick={() =>
                              handleImportSupplierResponses(supplierId, json)
                            }
                            disabled={!isValid || loading || isImported}
                            className="flex-1"
                          >
                            {loading
                              ? "Import en cours..."
                              : isImported
                                ? "Importé ✓"
                                : `Importer pour ${supplier.name}`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer - Skip to RFP */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() =>
                    router.push(`/dashboard/rfp/${rfpId}/evaluate`)
                  }
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Aller au RFP →
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
