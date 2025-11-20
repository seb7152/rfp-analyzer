"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface SupplierDocument {
  id: string;
  name: string;
  uploadedAt: string;
}

interface SupplierData {
  id: string;
  name: string;
  scorePercentage: number; // Note du fournisseur (score pondéré) on 0-100 scale
  responseCompletionPercentage: number; // % de réponses checked
  checkedResponses: number;
  totalResponses: number;
  documents: SupplierDocument[];
  hasDocuments: boolean;
  ranking: number; // Position in ranking
}

type SortBy = "name" | "score" | "responses";

interface SuppliersTabProps {
  rfpId: string;
}

export function SuppliersTab({ rfpId }: SuppliersTabProps) {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/rfps/${rfpId}/suppliers`);
        if (!response.ok) throw new Error("Failed to fetch suppliers");

        const responseData = await response.json();
        const data = responseData.suppliers || [];
        const suppliersWithDocs = await Promise.all(
          data.map(async (supplier: any) => {
            // Fetch documents
            const docsResponse = await fetch(
              `/api/rfps/${rfpId}/documents?supplierId=${supplier.id}`,
            );
            const docsData = docsResponse.ok
              ? await docsResponse.json()
              : { documents: [] };
            const documents = (docsData.documents || []).map((doc: any) => ({
              id: doc.id,
              name: doc.filename || doc.original_filename || "Document",
              uploadedAt: doc.created_at || doc.uploadedAt || "",
            }));

            // Fetch supplier score (weighted completion)
            let scorePercentage = 0;
            try {
              const completionResponse = await fetch(
                `/api/rfps/${rfpId}/suppliers/${supplier.id}/completion`,
              );
              if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                scorePercentage = completionData.completionPercentage || 0;
              }
            } catch (err) {
              console.error("Error fetching supplier score:", err);
            }

            // Fetch response completion stats (checked responses)
            let responseCompletionPercentage = 0;
            let checkedResponses = 0;
            let totalResponses = 0;
            try {
              const responseStatsResponse = await fetch(
                `/api/rfps/${rfpId}/suppliers/${supplier.id}/responses`,
              );
              if (responseStatsResponse.ok) {
                const responseStats = await responseStatsResponse.json();
                responseCompletionPercentage =
                  responseStats.completionPercentage || 0;
                checkedResponses = responseStats.checkedResponses || 0;
                totalResponses = responseStats.totalResponses || 0;
              }
            } catch (err) {
              console.error("Error fetching response stats:", err);
            }

            return {
              id: supplier.id,
              name: supplier.name,
              scorePercentage,
              responseCompletionPercentage,
              checkedResponses,
              totalResponses,
              documents: documents,
              hasDocuments: documents.length > 0,
            };
          }),
        );

        // Add ranking position and sort by score
        const sortedSuppliers = [...suppliersWithDocs].sort(
          (a, b) => b.scorePercentage - a.scorePercentage,
        );
        const suppliersWithRanking = sortedSuppliers.map((supplier, index) => ({
          ...supplier,
          ranking: index + 1,
        }));

        setSuppliers(suppliersWithRanking);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue",
        );
      } finally {
        setLoading(false);
      }
    };

    if (rfpId) {
      fetchSuppliers();
    }
  }, [rfpId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement des fournisseurs...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">Erreur: {error}</div>;
  }

  // Helper function to handle column sorting
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  // Sort suppliers based on current sort settings
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "score":
        comparison = a.scorePercentage - b.scorePercentage;
        break;
      case "responses":
        comparison =
          a.responseCompletionPercentage - b.responseCompletionPercentage;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Recalculate rankings after sorting
  const suppliersWithCurrentRanking = sortedSuppliers.map(
    (supplier, index) => ({
      ...supplier,
      currentRanking: sortBy === "score" ? supplier.ranking : index + 1,
    }),
  );

  const SortIcon = ({ column }: { column: SortBy }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-slate-300" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpDown className="h-4 w-4" />
    ) : (
      <ArrowUpDown className="h-4 w-4 rotate-180" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Fournisseur
                  <SortIcon column="name" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("score")}
              >
                <div className="flex items-center gap-2">
                  Note
                  <SortIcon column="score" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("responses")}
              >
                <div className="flex items-center gap-2">
                  Réponses
                  <SortIcon column="responses" />
                </div>
              </TableHead>
              <TableHead>Fichiers</TableHead>
              <TableHead className="w-10">Actions</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersWithCurrentRanking.map((supplier) => (
              <>
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedSupplier(
                      expandedSupplier === supplier.id ? null : supplier.id,
                    )
                  }
                >
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">
                        {((supplier.scorePercentage / 100) * 20).toFixed(2)}/20
                      </div>
                      <div className="text-xs text-slate-500">
                        Pos. {supplier.currentRanking}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900">
                        {supplier.checkedResponses}/{supplier.totalResponses}
                      </div>
                      <div className="text-xs text-slate-500">
                        {supplier.responseCompletionPercentage}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {supplier.documents.length} fichier(s)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/rfp/${rfpId}/evaluate?supplierId=${supplier.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Évaluer ce fournisseur"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </Button>
                    </Link>
                  </TableCell>
                  <TableCell className="w-10">
                    {supplier.hasDocuments && (
                      <div>
                        {expandedSupplier === supplier.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>

                {expandedSupplier === supplier.id && supplier.hasDocuments && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-gray-50 p-4">
                      <Card className="border-0 bg-white">
                        <div className="p-4">
                          <h4 className="font-semibold mb-3">Fichiers</h4>
                          <div className="space-y-2">
                            {supplier.documents.map((doc) => {
                              const uploadDate = new Date(doc.uploadedAt);
                              const isValidDate = !isNaN(uploadDate.getTime());
                              return (
                                <div
                                  key={doc.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100"
                                >
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {doc.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {isValidDate
                                        ? uploadDate.toLocaleDateString("fr-FR")
                                        : "Date inconnue"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
