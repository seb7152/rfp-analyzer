"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import { CreateTemplateModal } from "@/components/financial/CreateTemplateModal";
import { TemplateEditor } from "@/components/financial/TemplateEditor";
import { ComparisonGrid } from "@/components/financial/ComparisonGrid";
import { FinancialTemplateLine } from "@/lib/financial/calculations";
import { useSuppliers } from "@/hooks/use-financial-data";



interface FinancialTemplate {
  id: string;
  rfp_id: string;
  name: string;
  total_period_years: number;
  created_at: string;
  updated_at: string;
}

export default function FinancialGridPage() {
  const router = useRouter();
  const params = useParams();
  const rfpId = (Array.isArray(params.rfpId) ? params.rfpId[0] : params.rfpId) as string;
  const { user, isLoading: authLoading } = useAuth();
  const [template, setTemplate] = useState<FinancialTemplate | null>(null);
  const [lines, setLines] = useState<FinancialTemplateLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");
  const [viewMode, setViewMode] = useState<"template-definition" | "comparison">("comparison");

  // Fetch Suppliers
  // Using useParams hook for reliability in Client Components
  const { data: suppliers = [] } = useSuppliers(rfpId);

  // Fetch RFP data
  useEffect(() => {
    const fetchRFPData = async () => {
      try {
        const response = await fetch(`/api/rfps/${rfpId}`);
        if (response.ok) {
          const data = await response.json();
          setRfpTitle(data.title || `RFP ${rfpId.slice(0, 8)}`);
        }
      } catch (error) {
        console.error("Failed to fetch RFP data:", error);
      }
    };

    if (rfpId) {
      fetchRFPData();
    }
  }, [rfpId]);

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
          // If we have a template, default to comparison view if we have suppliers? 
          // Or stick to default.
        } else if (response.status === 404 || response.status === 200) {
          // No template exists yet
          setTemplate(null);
          setLines([]);
          setViewMode("template-definition");
        } else {
          console.error("Failed to fetch template:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching template:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (rfpId && user) {
      fetchTemplate();
    }
  }, [rfpId, user]);

  const handleTemplateCreated = (newTemplate: FinancialTemplate) => {
    setTemplate(newTemplate);
    setIsCreateModalOpen(false);
    setViewMode("template-definition"); // Go to editor first
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

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/rfp/${params.rfpId}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grille Financière</h1>
              <p className="text-sm text-gray-600">{rfpTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {template && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[400px] mr-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comparison">Comparaison & Saisie</TabsTrigger>
                  <TabsTrigger value="template-definition">Définition Template</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {template && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Export functionality
                }}
              >
                Exporter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        {!template ? (
          <Card className="mx-auto max-w-2xl mt-10">
            <CardHeader>
              <CardTitle>Créer un template financier</CardTitle>
              <CardDescription>
                Commencez par créer un template financier pour définir la structure des coûts
                à comparer entre les fournisseurs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col h-full space-y-4">
            {/* Info and Tabs */}
            <div className="flex justify-between items-start">
              <Card className="w-full">
                <CardHeader className="py-4 pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        Période TCO: {template.total_period_years} an{template.total_period_years > 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Tab Content Area - utilizing flex-1 to fill remaining height */}
            <div className="flex-1 overflow-hidden relative border rounded-md bg-white shadow-sm">
              {viewMode === "template-definition" ? (
                <div className="h-full overflow-auto p-4">
                  <TemplateEditor
                    templateId={template.id}
                    lines={lines}
                    onLineAdded={handleLineAdded}
                    onLineUpdated={handleLineUpdated}
                    onLineDeleted={handleLineDeleted}
                  />
                </div>
              ) : (
                <div className="h-full w-full">
                  <ComparisonGrid
                    rfpId={rfpId}
                    templateLines={lines}
                    suppliers={suppliers}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        rfpId={rfpId}
        onTemplateCreated={handleTemplateCreated}
      />
    </div>
  );
}
