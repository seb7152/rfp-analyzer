"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Supplier } from "@/types/supplier";

interface TreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  description?: string;
  children?: TreeNode[];
  level?: number;
  analysis?: {
    forces: string[];
    faiblesses: string[];
  };
}

interface SupplierStatus {
  id: string;
  shortlist_status: "active" | "shortlisted" | "removed";
  removal_reason?: string | null;
}

interface CategoryAnalysisTableMobileProps {
  flatCategories: (TreeNode & { level: number })[];
  suppliers: Supplier[];
  supplierStatuses: Record<string, SupplierStatus>;
  selectedSupplierId: string | null;
  onSupplierChange: (supplierId: string) => void;
  onRefresh: () => void;
  onAnalyze: () => void;
  isRefreshing: boolean;
  analysisLoading: boolean;
  getCategoryScore: (categoryId: string, supplierId: string) => number | null;
  getAverageCategoryScore: (categoryId: string) => number | null;
  getChildTitles: (categoryId: string) => string[];
  getAttentionPoints: (
    categoryId: string,
    supplierId?: string,
    isExpanded?: boolean
  ) => string[];
}

const getScoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-200 text-slate-600";
  if (score >= 3.5) return "bg-emerald-600 text-white";
  if (score >= 3.0) return "bg-emerald-500 text-white";
  if (score >= 2.5) return "bg-emerald-400 text-white";
  if (score >= 2.0) return "bg-yellow-400 text-slate-900";
  if (score >= 1.0) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
};

const formatScore = (score: number | null) => {
  if (score === null) return "-";
  return score.toFixed(1);
};

export function CategoryAnalysisTableMobile({
  flatCategories,
  suppliers,
  supplierStatuses,
  selectedSupplierId,
  onSupplierChange,
  onRefresh,
  onAnalyze,
  isRefreshing,
  analysisLoading,
  getCategoryScore,
  getAverageCategoryScore,
  getChildTitles,
  getAttentionPoints,
}: CategoryAnalysisTableMobileProps) {
  return (
    <Card className="w-full mb-8">
      <CardHeader className="pb-4 space-y-4">
        <CardTitle className="text-lg font-medium">
          Analyse par Catégorie
        </CardTitle>

        {/* Supplier selector */}
        {suppliers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Soumissionnaire:
            </label>
            <Select
              value={selectedSupplierId || ""}
              onValueChange={onSupplierChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un soumissionnaire" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => {
                  const status = supplierStatuses[supplier.id];
                  return (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex items-center gap-2">
                        <span>{supplier.name}</span>
                        {status && status.shortlist_status !== "active" && (
                          <Badge
                            variant={
                              status.shortlist_status === "removed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {status.shortlist_status === "removed"
                              ? "Supprimé"
                              : "Sélectionné"}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Alerts */}
        {selectedSupplierId &&
          (() => {
            const status = supplierStatuses[selectedSupplierId];
            return (
              status && (
                <div className="space-y-2">
                  {status.shortlist_status === "removed" &&
                    status.removal_reason && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Raison de la suppression:</strong>{" "}
                          {status.removal_reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  {status.shortlist_status === "shortlisted" && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Ce fournisseur a été sélectionné pour cette version.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            );
          })()}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2 text-xs"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">Rafraîchir</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            disabled={analysisLoading || !selectedSupplierId}
            className="gap-2 text-xs"
          >
            {analysisLoading ? (
              <>
                <span className="animate-spin">✨</span>
                <span className="hidden sm:inline">Analyse...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Analyser</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            title="Exporter (fonctionnalité desktop)"
            disabled
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Categories Accordion */}
        <Accordion type="single" collapsible className="space-y-2">
          {flatCategories.map((category) => {
            const score =
              selectedSupplierId && selectedSupplierId !== ""
                ? getCategoryScore(category.id, selectedSupplierId)
                : null;
            const averageScore = getAverageCategoryScore(category.id);
            const childTitles = getChildTitles(category.id);
            const attentionPoints = getAttentionPoints(
              category.id,
              selectedSupplierId || undefined,
              true
            );
            const analysis = category.analysis;

            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                className="border rounded px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-start gap-3 w-full text-left flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          {category.code}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">
                        {category.title}
                      </p>
                    </div>
                    {score !== null && (
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs font-bold flex-shrink-0",
                          getScoreColor(score)
                        )}
                      >
                        {formatScore(score)}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {/* Score comparison */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded space-y-2">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Note
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Soumissionnaire:</span>
                        <div
                          className={cn(
                            "px-2 py-1 rounded text-xs font-bold",
                            getScoreColor(score)
                          )}
                        >
                          {formatScore(score)}/5
                        </div>
                      </div>
                      {averageScore !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs">Moyenne:</span>
                          <div className="px-2 py-1 rounded text-xs font-medium text-slate-600">
                            {formatScore(averageScore)}/5
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Child titles */}
                  {childTitles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Exigences
                      </div>
                      <ul className="space-y-1 text-xs">
                        {childTitles.map((title, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-slate-700 dark:text-slate-300"
                          >
                            <span className="flex-shrink-0">•</span>
                            <span className="break-words">{title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Forces */}
                  {analysis?.forces && analysis.forces.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        ✓ Forces
                      </div>
                      <ul className="space-y-1 text-xs">
                        {analysis.forces.map((force, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-slate-700 dark:text-slate-300"
                          >
                            <span className="flex-shrink-0">•</span>
                            <span className="break-words">{force}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Faiblesses */}
                  {analysis?.faiblesses && analysis.faiblesses.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-red-700 dark:text-red-400">
                        ✗ Faiblesses
                      </div>
                      <ul className="space-y-1 text-xs">
                        {analysis.faiblesses.map((faiblesse, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-slate-700 dark:text-slate-300"
                          >
                            <span className="flex-shrink-0">•</span>
                            <span className="break-words">{faiblesse}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Points d'attention */}
                  {attentionPoints.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        ❓ Points d'attention
                      </div>
                      <ul className="space-y-1 text-xs">
                        {attentionPoints.map((point, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-slate-700 dark:text-slate-300"
                          >
                            <span className="flex-shrink-0">•</span>
                            <span className="break-words">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
