"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, DollarSign, PenBox, Grid } from "lucide-react";
import { CreateTemplateModal } from "@/components/financial/CreateTemplateModal";
import { TemplateEditor } from "@/components/financial/TemplateEditor";
import { FinancialGrid } from "@/components/financial/FinancialGrid"; // US-3: Added
import { FinancialTemplateLine } from "@/lib/financial/calculations";
import { useSuppliers } from "@/hooks/use-suppliers"; // Need this hook or fetch manually

interface FinancialTemplate {
  id: string;
  rfp_id: string;
  name: string;
  total_period_years: number;
  created_at: string;
  updated_at: string;
}

interface FinancialGridTabProps {
  rfpId: string;
}

export function FinancialGridTab({ rfpId }: FinancialGridTabProps) {
  const [template, setTemplate] = useState<FinancialTemplate | null>(null);
  const [lines, setLines] = useState<FinancialTemplateLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // US-3: Editor mode toggle
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  // US-3: Fetch suppliers for the grid
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliers(rfpId);

  // Fetch financial template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/rfps/${rfpId}/financial-template`);
        if (response.ok) {
          const data = await response.json();
          setTemplate(data.template);
          setLines(data.lines || []);
        } else if (response.status === 404 || response.status === 200) {
          // No template exists yet
          setTemplate(null);
          setLines([]);
        } else {
          console.error("Failed to fetch template:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching template:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (rfpId) {
      fetchTemplate();
    }
  }, [rfpId]);

  const handleTemplateCreated = (newTemplate: FinancialTemplate) => {
    setTemplate(newTemplate);
    setIsCreateModalOpen(false);
  };

  const handleLineAdded = (line: FinancialTemplateLine) => {
    setLines((prev) => [...prev, line].sort((a, b) => a.sort_order - b.sort_order));
  };

  const handleLineUpdated = (line: FinancialTemplateLine) => {
    setLines((prev) =>
      prev.map((l) => (l.id === line.id ? line : l))
    );
  };

  const handleLineDeleted = (lineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  if (isLoading || isLoadingSuppliers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/20">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle>Grille Financière</CardTitle>
              <CardDescription>
                Comparez les offres financières des fournisseurs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Aucun template financier n'existe pour ce RFP.
              <br />
              Créez un template pour commencer à analyser les coûts.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un template
            </Button>
          </div>
        </CardContent>

        <CreateTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          rfpId={rfpId}
          onTemplateCreated={handleTemplateCreated}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Template info / Actions */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 shrink-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/20">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>
                  Période TCO: {template.total_period_years} an
                  {template.total_period_years > 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Export functionality
                }}
              >
                Exporter
              </Button>
              <Button
                variant={isEditingTemplate ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
              >
                {isEditingTemplate ? (
                  <>
                    <Grid className="mr-2 h-4 w-4" /> Voir la grille
                  </>
                ) : (
                  <>
                    <PenBox className="mr-2 h-4 w-4" /> Modifier template
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content: Editor or Grid */}
      {isEditingTemplate ? (
        <TemplateEditor
          templateId={template.id}
          lines={lines}
          onLineAdded={handleLineAdded}
          onLineUpdated={handleLineUpdated}
          onLineDeleted={handleLineDeleted}
        />
      ) : (
        <div className="flex-1 min-h-0">
          <FinancialGrid
            rfpId={rfpId}
            templateLines={lines}
            templatePeriodYears={template.total_period_years}
            suppliers={suppliers.map((s: any) => ({
              id: s.id,
              name: s.company_name || s.contact_name || s.email || "Fournisseur"
            }))}
          />
        </div>
      )}
    </div>
  );
}
