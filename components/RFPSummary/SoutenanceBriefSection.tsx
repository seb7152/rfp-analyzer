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
import rehypeRaw from "rehype-raw";
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
  // Pre-process dirty markdown from some LLMs
  const processedContent = content
    // Fix "- []" or "-[]" -> "- [ ] "
    .replace(/^(\s*)-\s*\[\s*\]\s*/gm, "$1- [ ] ")
    // Fix "- [x]" or "-[x]" -> "- [x] "
    .replace(/^(\s*)-\s*\[x\]\s*/gmi, "$1- [x] ")
    // Fix headers without space like "#3. Roadmap" -> "### 3. Roadmap"
    .replace(/^#(\d+\.)/gm, "### $1");

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0 text-slate-800 dark:text-slate-100">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-100">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="mb-3 text-slate-600 dark:text-slate-300 leading-relaxed">{children}</p>,
        ul: ({ children, className }) => {
          const isTaskList = className?.includes('contains-task-list');
          return (
            <ul className={`list-outside mb-4 space-y-1 ${isTaskList ? '!list-none !pl-0' : 'list-disc pl-5'} ${className || ''}`}>
              {children}
            </ul>
          );
        },
        ol: ({ children, className }) => (
          <ol className={`list-decimal list-outside mb-4 space-y-1 pl-5 ${className || ''}`}>
            {children}
          </ol>
        ),
        li: ({ children, className }) => {
          const isTaskListItem = className?.includes('task-list-item');
          return (
            <li className={`${isTaskListItem ? '!list-none flex items-start gap-2.5 marker:text-transparent marker:content-none !pl-0' : 'pl-1'} ${className || ''}`}>
              {children}
            </li>
          );
        },
        input: ({ type, checked, disabled }) => {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={checked}
                readOnly={disabled}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
            );
          }
          return <input type={type} checked={checked} disabled={disabled} />;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-900/20 pl-4 py-2 italic my-4 rounded-r text-slate-700 dark:text-slate-300">
            {children}
          </blockquote>
        ),
        code: ({ children, ...props }: any) => {
          const inline = !props.className?.includes("language-");
          return inline ? (
            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
              {children}
            </code>
          ) : (
            <code
              className="block bg-slate-900 text-slate-50 p-4 rounded-lg mb-4 overflow-x-auto font-mono text-sm shadow-sm"
              {...props}
            >
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto mb-5 rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="border-collapse w-full text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {children}
          </thead>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 align-top">
            {children}
          </td>
        ),
      }}
    >
      {processedContent}
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
      {currentBrief?.status === "completed" && (
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
              <MarkdownRenderer content={currentBrief.report_markdown || "_Le brief renvoyé par l'IA est vide._"} />
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
