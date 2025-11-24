"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { Supplier } from "@/types/supplier";
import { Response } from "@/types/response";

// Types
interface RequirementTreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  is_mandatory?: boolean;
  is_optional?: boolean;
  children?: RequirementTreeNode[];
}

interface RequirementsHeatmapProps {
  rfpId: string;
}

// Helper functions for colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "pass":
      return "bg-emerald-500 hover:bg-emerald-600 text-white";
    case "fail":
      return "bg-red-500 hover:bg-red-600 text-white";
    case "partial":
      return "bg-orange-500 hover:bg-orange-600 text-white";
    case "pending":
      return "bg-slate-200 hover:bg-slate-300 text-slate-600";
    default:
      return "bg-slate-100 hover:bg-slate-200 text-slate-500";
  }
};

const getScoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-200 hover:bg-slate-300 text-slate-600";

  if (score >= 3.5) return "bg-emerald-600 text-white"; // Excellent
  if (score >= 3.0) return "bg-emerald-500 text-white"; // Vert moyen
  if (score >= 2.5) return "bg-emerald-400 text-white"; // Vert clair
  if (score >= 2.0) return "bg-yellow-400 text-slate-900"; // Jaune
  if (score >= 1.0) return "bg-orange-400 text-white"; // Orange
  return "bg-red-500 text-white"; // Rouge
};

const formatScore = (score: number | null) => {
  if (score === null) return "-";
  return score.toFixed(1);
};

export function RequirementsHeatmap({ rfpId }: RequirementsHeatmapProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requirements, setRequirements] = useState<RequirementTreeNode[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"score" | "status">("status");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch suppliers
        const suppliersRes = await fetch(`/api/rfps/${rfpId}/suppliers`);
        const suppliersData = await suppliersRes.json();

        // Fetch requirements tree
        const treeRes = await fetch(`/api/rfps/${rfpId}/tree`);
        const treeData = await treeRes.json();

        // Fetch responses
        const responsesRes = await fetch(`/api/rfps/${rfpId}/responses`);
        const responsesData = await responsesRes.json();

        setSuppliers(suppliersData.suppliers || []);
        setRequirements(treeData || []);
        setResponses(responsesData.responses || []);
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (rfpId) {
      fetchData();
    }
  }, [rfpId]);

  // Flatten requirements tree
  const flatRequirements = useMemo(() => {
    const flat: {
      id: string;
      code: string;
      title: string;
      level: number;
      is_mandatory: boolean;
      is_optional: boolean;
    }[] = [];

    function traverse(nodes: RequirementTreeNode[], level: number) {
      for (const node of nodes) {
        if (node.type === "requirement") {
          flat.push({
            id: node.id,
            code: node.code,
            title: node.title,
            level,
            is_mandatory: node.is_mandatory || false,
            is_optional: node.is_optional || false,
          });
        }
        if (node.children) {
          traverse(node.children, level + 1);
        }
      }
    }

    traverse(requirements, 0);
    return flat;
  }, [requirements]);

  // Index responses for quick lookup
  const responseMap = useMemo(() => {
    const map = new Map<string, Response>();
    responses.forEach((r) => {
      map.set(`${r.requirement_id}-${r.supplier_id}`, r);
    });
    return map;
  }, [responses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement de la heatmap...
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Heatmap des Exigences</CardTitle>
            <CardDescription>
              Comparaison visuelle des réponses par fournisseur
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Mode d'affichage :
            </span>
            <Select
              value={mode}
              onValueChange={(v: "score" | "status") => setMode(v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Statuts</SelectItem>
                <SelectItem value="score">Notes (0-4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto max-h-[600px] border rounded-md">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[300px]"
                >
                  Exigence
                </th>
                {suppliers.map((supplier) => (
                  <th
                    key={supplier.id}
                    scope="col"
                    className="px-2 py-3 w-24 text-center border-b border-r last:border-r-0 min-w-[96px]"
                  >
                    <div
                      className="truncate max-w-[90px] mx-auto"
                      title={supplier.name}
                    >
                      {supplier.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flatRequirements.map((req) => (
                <tr
                  key={req.id}
                  className="bg-white border-b hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r min-w-[300px] group-hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        {req.code}
                      </span>
                      <span
                        className="truncate max-w-[200px]"
                        title={req.title}
                      >
                        {req.title}
                      </span>
                      {req.is_mandatory && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
                          M
                        </span>
                      )}
                      {req.is_optional && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0">
                          O
                        </span>
                      )}
                    </div>
                  </td>
                  {suppliers.map((supplier) => {
                    const response = responseMap.get(
                      `${req.id}-${supplier.id}`
                    );
                    const score =
                      response?.manual_score ?? response?.ai_score ?? null;
                    const status = response?.status || "pending";

                    return (
                      <td
                        key={`${req.id}-${supplier.id}`}
                        className="p-1 border-r last:border-r-0 text-center align-middle w-24 min-w-[96px]"
                      >
                        <div
                          className={cn(
                            "w-full h-8 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-help shadow-sm",
                            mode === "status"
                              ? getStatusColor(status)
                              : getScoreColor(score)
                          )}
                          title={`${supplier.name} - ${req.code}\nStatus: ${status}\nNote: ${formatScore(score)}${response?.manual_comment ? `\nCommentaire: ${response.manual_comment}` : ""}`}
                        >
                          {mode === "score" && formatScore(score)}
                          {mode === "status" && (
                            <span className="capitalize">
                              {status === "pending" ? "-" : status}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 sticky bottom-0 z-10">
              <tr>
                <td className="px-4 py-3 font-semibold text-sm text-slate-700 sticky left-0 bg-slate-50 z-20 border-r">
                  Statistiques
                </td>
                {suppliers.map((supplier) => {
                  // Calculate statistics for this supplier
                  const supplierResponses = flatRequirements
                    .map((req) => responseMap.get(`${req.id}-${supplier.id}`))
                    .filter(Boolean) as Response[];

                  const totalRequirements = flatRequirements.length;
                  const passCount = supplierResponses.filter(
                    (r) => r.status === "pass"
                  ).length;
                  const passPercentage =
                    totalRequirements > 0
                      ? Math.round((passCount / totalRequirements) * 100)
                      : 0;

                  const mandatoryRequirements = flatRequirements.filter(
                    (req) => req.is_mandatory
                  );
                  const mandatoryTotal = mandatoryRequirements.length;
                  const mandatoryPassCount = mandatoryRequirements.filter(
                    (req) => {
                      const response = responseMap.get(
                        `${req.id}-${supplier.id}`
                      );
                      return response?.status === "pass";
                    }
                  ).length;
                  const mandatoryPassPercentage =
                    mandatoryTotal > 0
                      ? Math.round((mandatoryPassCount / mandatoryTotal) * 100)
                      : 0;

                  const optionalRequirements = flatRequirements.filter(
                    (req) => req.is_optional
                  );
                  const optionalTotal = optionalRequirements.length;
                  const optionalPassCount = optionalRequirements.filter(
                    (req) => {
                      const response = responseMap.get(
                        `${req.id}-${supplier.id}`
                      );
                      return response?.status === "pass";
                    }
                  ).length;
                  const optionalPassPercentage =
                    optionalTotal > 0
                      ? Math.round((optionalPassCount / optionalTotal) * 100)
                      : 0;

                  return (
                    <td
                      key={`stats-${supplier.id}`}
                      className="p-2 border-r last:border-r-0 w-24 min-w-[96px]"
                    >
                      <div className="text-[10px] space-y-1">
                        <div className="font-semibold text-slate-700">
                          Pass: {passPercentage}%
                        </div>
                        {mandatoryTotal > 0 && (
                          <div className="text-red-700">
                            M: {mandatoryPassCount}/{mandatoryTotal} (
                            {mandatoryPassPercentage}%)
                          </div>
                        )}
                        {optionalTotal > 0 && (
                          <div className="text-blue-700">
                            O: {optionalPassCount}/{optionalTotal} (
                            {optionalPassPercentage}%)
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            {mode === "status" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>Conforme (Pass)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span>Partiel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span>Non conforme (Fail)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></div>
                  <span>En attente</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-600"></div>
                  <span>Excellent (&ge; 3.5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>Très Bon (&ge; 3.0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-400"></div>
                  <span>Bon (&ge; 2.5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-yellow-400"></div>
                  <span>Moyen (&ge; 2.0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-orange-400"></div>
                  <span>Faible (&ge; 1.0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span>Critique (&lt; 1.0)</span>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                M
              </span>
              <span>Exigence Mandatory (Obligatoire)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                O
              </span>
              <span>Exigence Optionnelle</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
