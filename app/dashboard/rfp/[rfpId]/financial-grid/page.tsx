"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import { CreateTemplateModal } from "@/components/financial/CreateTemplateModal";
import { TemplateEditor } from "@/components/financial/TemplateEditor";
import { FinancialTemplateLine } from "@/lib/financial/calculations";

interface FinancialGridPageProps {
  params: {
    rfpId: string;
  };
}

interface FinancialTemplate {
  id: string;
  rfp_id: string;
  name: string;
  total_period_years: number;
  created_at: string;
  updated_at: string;
}

export default function FinancialGridPage({ params }: FinancialGridPageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [template, setTemplate] = useState<FinancialTemplate | null>(null);
  const [lines, setLines] = useState<FinancialTemplateLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rfpTitle, setRfpTitle] = useState<string>("RFP");

  // Fetch RFP data
  useEffect(() => {
    const fetchRFPData = async () => {
      try {
        const response = await fetch(`/api/rfps/${params.rfpId}`);
        if (response.ok) {
          const data = await response.json();
          setRfpTitle(data.title || `RFP ${params.rfpId.slice(0, 8)}`);
        }
      } catch (error) {
        console.error("Failed to fetch RFP data:", error);
      }
    };

    if (params.rfpId) {
      fetchRFPData();
    }
  }, [params.rfpId]);

  // Fetch financial template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/rfps/${params.rfpId}/financial-template`);
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

    if (params.rfpId && user) {
      fetchTemplate();
    }
  }, [params.rfpId, user]);

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

          {template && (
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
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {!template ? (
          <Card className="mx-auto max-w-2xl">
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
          <div className="space-y-6">
            {/* Template info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>
                      Période TCO: {template.total_period_years} an{template.total_period_years > 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Edit template functionality
                    }}
                  >
                    Modifier
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Template Editor */}
            <TemplateEditor
              templateId={template.id}
              lines={lines}
              onLineAdded={handleLineAdded}
              onLineUpdated={handleLineUpdated}
              onLineDeleted={handleLineDeleted}
            />
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        rfpId={params.rfpId}
        onTemplateCreated={handleTemplateCreated}
      />
    </div>
  );
}
