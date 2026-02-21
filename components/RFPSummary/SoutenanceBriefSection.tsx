"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Clock,
  Loader,
  RefreshCw,
  AlertTriangle,
  Check,
  FileText,
  Copy,
  Download,
  Sparkles,
} from "lucide-react";
import {
  useLatestSoutenanceBriefs,
  useGenerateSoutenanceBrief,
  useUpdateSoutenanceBriefReport,
  type SoutenanceBrief,
} from "@/hooks/use-soutenance";

interface Supplier {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "partial", label: "Partiellement conforme" },
  { value: "fail", label: "Non conforme" },
  { value: "roadmap", label: "Roadmap" },
] as const;

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
        ),
        p: ({ children }) => <p className="mb-3">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-3">
            {children}
          </blockquote>
        ),
        code: ({ children, ...props }: any) => {
          const inline = !props.className?.includes("language-");
          return inline ? (
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono">
              {children}
            </code>
          ) : (
            <code
              className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-3 overflow-x-auto font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <table className="border-collapse border border-slate-300 dark:border-slate-600 w-full mb-3">
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-left">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface SupplierBriefPanelProps {
  rfpId: string;
  supplier: Supplier;
  versionId?: string;
}

function SupplierBriefPanel({ rfpId, supplier, versionId }: SupplierBriefPanelProps) {
  const [targetStatuses, setTargetStatuses] = useState<string[]>([
    "partial",
    "fail",
    "roadmap",
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: briefs,
    isLoading,
    refetch,
  } = useLatestSoutenanceBriefs(rfpId, supplier.id);

  const generateMutation = useGenerateSoutenanceBrief(rfpId);
  const updateMutation = useUpdateSoutenanceBriefReport(rfpId);

  const currentBrief: SoutenanceBrief | undefined = briefs?.[0];

  useEffect(() => {
    if (currentBrief?.report_markdown) {
      setEditedReport(currentBrief.report_markdown);
    }
  }, [currentBrief?.report_markdown]);

  // Auto-refresh when processing
  useEffect(() => {
    if (currentBrief?.status !== "processing") return;

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentBrief?.status, refetch]);

  const handleGenerate = async () => {
    if (targetStatuses.length === 0) {
      toast.error("Sélectionnez au moins un statut");
      return;
    }
    try {
      await generateMutation.mutateAsync({
        supplierId: supplier.id,
        versionId,
        targetStatuses,
      });
      toast.success("Génération du brief lancée");
      await refetch();
    } catch {
      toast.error("Erreur lors du lancement de la génération");
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleSaveReport = async () => {
    if (!currentBrief) return;
    try {
      await updateMutation.mutateAsync({
        briefId: currentBrief.id,
        report: editedReport,
      });
      setIsEditing(false);
      toast.success("Brief sauvegardé");
      await refetch();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleCancelEdit = () => {
    if (currentBrief?.report_markdown) {
      setEditedReport(currentBrief.report_markdown);
    }
    setIsEditing(false);
  };

  const handleCopyMarkdown = async () => {
    const content = currentBrief?.report_markdown;
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success("Contenu copié dans le presse-papiers");
  };

  const handleDownloadMarkdown = () => {
    const content = currentBrief?.report_markdown;
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brief-soutenance-${supplier.name.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleStatus = (value: string) => {
    setTargetStatuses((prev) =>
      prev.includes(value)
        ? prev.filter((s) => s !== value)
        : [...prev, value]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation Card */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">
              Générer le brief de soutenance
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Regroupe les points à aborder pour les exigences sélectionnées
            </p>

            {/* Status checkboxes */}
            <div className="flex flex-wrap gap-4">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${value}-${supplier.id}`}
                    checked={targetStatuses.includes(value)}
                    onCheckedChange={() => toggleStatus(value)}
                  />
                  <Label
                    htmlFor={`status-${value}-${supplier.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              generateMutation.isPending ||
              currentBrief?.status === "processing" ||
              targetStatuses.length === 0
            }
            className="gap-2 shrink-0"
          >
            {generateMutation.isPending ||
            currentBrief?.status === "processing" ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer
              </>
            )}
          </Button>
        </div>

        {/* Status indicator */}
        {currentBrief && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {currentBrief.status === "completed" && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Brief généré</span>
                </>
              )}
              {currentBrief.status === "processing" && (
                <>
                  <Loader className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-blue-600 font-medium">
                    Génération en cours...
                  </span>
                </>
              )}
              {currentBrief.status === "pending" && (
                <>
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-500">En attente...</span>
                </>
              )}
              {currentBrief.status === "failed" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">
                    Erreur : {currentBrief.error_message ?? "Échec de la génération"}
                  </span>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        )}
      </Card>

      {/* Report Card */}
      {currentBrief?.status === "completed" && currentBrief.report_markdown && (
        <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-medium text-slate-900 dark:text-white">
              Brief de soutenance
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMarkdown}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadMarkdown}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                .md
              </Button>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Éditer
                </Button>
              )}
            </div>
          </div>

          <div
            className="overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300"
            style={{ maxHeight: "600px" }}
          >
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={editedReport}
                  onChange={(e) => setEditedReport(e.target.value)}
                  className="min-h-[500px] font-mono text-sm resize-none"
                  placeholder="Éditez le brief ici..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveReport}
                    disabled={updateMutation.isPending || !editedReport.trim()}
                    className="gap-2"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <MarkdownRenderer content={currentBrief.report_markdown} />
            )}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!currentBrief && (
        <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Sparkles className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">
            Aucun brief généré pour ce fournisseur.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Sélectionnez les statuts et cliquez sur "Générer".
          </p>
        </Card>
      )}
    </div>
  );
}

interface SoutenanceBriefSectionProps {
  rfpId: string;
  suppliers: Supplier[];
  versionId?: string;
}

export function SoutenanceBriefSection({
  rfpId,
  suppliers,
  versionId,
}: SoutenanceBriefSectionProps) {
  const [activeTab, setActiveTab] = useState<string>(suppliers[0]?.id || "");

  if (suppliers.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">
          Aucun fournisseur disponible
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full gap-2 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
          {suppliers.map((supplier) => (
            <TabsTrigger
              key={supplier.id}
              value={supplier.id}
              className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
            >
              {supplier.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {suppliers.map((supplier) => (
          <TabsContent
            key={supplier.id}
            value={supplier.id}
            className="mt-6"
          >
            <SupplierBriefPanel
              rfpId={rfpId}
              supplier={supplier}
              versionId={versionId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
