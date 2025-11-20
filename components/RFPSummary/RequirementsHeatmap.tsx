"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { Supplier } from "@/types/supplier";
import { Response } from "@/types/response";

// Types
interface RequirementTreeNode {
    id: string;
    code: string;
    title: string;
    type: "category" | "requirement";
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
        const flat: { id: string; code: string; title: string; level: number }[] = [];

        function traverse(nodes: RequirementTreeNode[], level: number) {
            for (const node of nodes) {
                if (node.type === "requirement") {
                    flat.push({
                        id: node.id,
                        code: node.code,
                        title: node.title,
                        level
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
        responses.forEach(r => {
            map.set(`${r.requirement_id}-${r.supplier_id}`, r);
        });
        return map;
    }, [responses]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-slate-500">Chargement de la heatmap...</div>
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
                        <span className="text-sm font-medium text-slate-700">Mode d'affichage :</span>
                        <Select value={mode} onValueChange={(v: "score" | "status") => setMode(v)}>
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
                                <th scope="col" className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[300px]">
                                    Exigence
                                </th>
                                {suppliers.map(supplier => (
                                    <th key={supplier.id} scope="col" className="px-2 py-3 w-24 text-center border-b border-r last:border-r-0 min-w-[96px]">
                                        <div className="truncate max-w-[90px] mx-auto" title={supplier.name}>
                                            {supplier.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {flatRequirements.map((req) => (
                                <tr key={req.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r min-w-[300px] group-hover:bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                                {req.code}
                                            </span>
                                            <span className="truncate max-w-[300px]" title={req.title}>
                                                {req.title}
                                            </span>
                                        </div>
                                    </td>
                                    {suppliers.map(supplier => {
                                        const response = responseMap.get(`${req.id}-${supplier.id}`);
                                        const score = response?.manual_score ?? response?.ai_score ?? null;
                                        const status = response?.status || "pending";

                                        return (
                                            <td key={`${req.id}-${supplier.id}`} className="p-1 border-r last:border-r-0 text-center align-middle w-24 min-w-[96px]">
                                                <div
                                                    className={cn(
                                                        "w-full h-8 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-help shadow-sm",
                                                        mode === "status" ? getStatusColor(status) : getScoreColor(score)
                                                    )}
                                                    title={`${supplier.name} - ${req.code}\nStatus: ${status}\nNote: ${formatScore(score)}${response?.manual_comment ? `\nCommentaire: ${response.manual_comment}` : ""}`}
                                                >
                                                    {mode === "score" && formatScore(score)}
                                                    {mode === "status" && (
                                                        <span className="capitalize">{status === "pass" ? "OK" : status === "fail" ? "KO" : status === "pending" ? "-" : status.slice(0, 4)}</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
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
            </CardContent>
        </Card>
    );
}
