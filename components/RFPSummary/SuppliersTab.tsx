"use client";

import { useState, useEffect } from "react";
import { useVersion } from "@/contexts/VersionContext";
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
  Trash2,
  RotateCcw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { SupplierStatusDialog } from "@/components/SupplierStatusDialog";

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
  shortlist_status?: "active" | "shortlisted" | "removed";
  removal_reason?: string;
}

type SortBy = "name" | "score" | "responses";

interface SuppliersTabProps {
  rfpId: string;
}

export function SuppliersTab({ rfpId }: SuppliersTabProps) {
  const { activeVersion } = useVersion();
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [removedSuppliers, setRemovedSuppliers] = useState<SupplierData[]>([]);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    supplierId: string;
    supplierName: string;
    currentStatus: "active" | "shortlisted" | "removed";
    removalReason?: string;
  }>({
    open: false,
    supplierId: "",
    supplierName: "",
    currentStatus: "active",
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);

        // Fetch active suppliers (filtered by version)
        let activeUrl = `/api/rfps/${rfpId}/suppliers?includeStats=true`;
        if (activeVersion?.id) {
          activeUrl += `&versionId=${activeVersion.id}`;
        }

        // Fetch all suppliers (without version filter) to get removed ones
        const allUrl = `/api/rfps/${rfpId}/suppliers?includeStats=true`;

        const [activeResponse, allResponse] = await Promise.all([
          fetch(activeUrl),
          fetch(allUrl),
        ]);

        if (!activeResponse.ok || !allResponse.ok) {
          throw new Error("Failed to fetch suppliers");
        }

        const activeData = await activeResponse.json();
        const allData = await allResponse.json();

        const activeSuppliers = activeData.suppliers || [];
        const allSuppliers = allData.suppliers || [];

        // If we have a version, fetch removed suppliers
        let removedSuppliersList: any[] = [];
        if (activeVersion?.id) {
          const removedResponse = await fetch(
            `/api/rfps/${rfpId}/suppliers?includeStats=true&versionId=${activeVersion.id}&includeRemoved=true`
          );

          if (removedResponse.ok) {
            const removedData = await removedResponse.json();
            // For now, we'll determine removed suppliers by comparing active vs all
            const activeIds = new Set(activeSuppliers.map((s: any) => s.id));
            removedSuppliersList = allSuppliers.filter(
              (s: any) => !activeIds.has(s.id)
            );
          }
        }

        // Map active suppliers
        const activeSuppliersWithDocs = activeSuppliers.map(
          (supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
            scorePercentage: supplier.scorePercentage || 0,
            responseCompletionPercentage:
              supplier.responseCompletionPercentage || 0,
            checkedResponses: supplier.checkedResponses || 0,
            totalResponses: supplier.totalResponses || 0,
            documents: supplier.documents || [],
            hasDocuments: (supplier.documents || []).length > 0,
            shortlist_status: "active" as const,
          })
        );

        // Map removed suppliers
        const removedSuppliersWithDocs = removedSuppliersList.map(
          (supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
            scorePercentage: supplier.scorePercentage || 0,
            responseCompletionPercentage:
              supplier.responseCompletionPercentage || 0,
            checkedResponses: supplier.checkedResponses || 0,
            totalResponses: supplier.totalResponses || 0,
            documents: supplier.documents || [],
            hasDocuments: (supplier.documents || []).length > 0,
            shortlist_status: "removed" as const,
          })
        );

        // Add ranking to active suppliers
        const sortedActiveSuppliers = [...activeSuppliersWithDocs].sort(
          (a, b) => b.scorePercentage - a.scorePercentage
        );
        const suppliersWithRanking = sortedActiveSuppliers.map(
          (supplier, index) => ({
            ...supplier,
            ranking: index + 1,
          })
        );

        setSuppliers(suppliersWithRanking);
        setRemovedSuppliers(removedSuppliersWithDocs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    if (rfpId) {
      fetchSuppliers();
    }
  }, [rfpId, activeVersion?.id]);

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
    })
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

  const handleSupplierStatus = (
    supplierId: string,
    supplierName: string,
    currentStatus: "active" | "shortlisted" | "removed",
    removalReason?: string
  ) => {
    setStatusDialog({
      open: true,
      supplierId,
      supplierName,
      currentStatus,
      removalReason,
    });
  };

  const handleStatusSuccess = () => {
    // Refetch suppliers to update the lists
    if (rfpId) {
      const fetchSuppliers = async () => {
        try {
          setLoading(true);
          
          let activeUrl = `/api/rfps/${rfpId}/suppliers?includeStats=true`;
          if (activeVersion?.id) {
            activeUrl += `&versionId=${activeVersion.id}`;
          }
          
          const allUrl = `/api/rfps/${rfpId}/suppliers?includeStats=true`;
          
          const [activeResponse, allResponse] = await Promise.all([
            fetch(activeUrl),
            fetch(allUrl)
          ]);

          if (!activeResponse.ok || !allResponse.ok) {
            throw new Error("Failed to fetch suppliers");
          }

          const activeData = await activeResponse.json();
          const allData = await allResponse.json();
          
          const activeSuppliers = activeData.suppliers || [];
          const allSuppliers = allData.suppliers || [];

          let removedSuppliersList: any[] = [];
          if (activeVersion?.id) {
            const activeIds = new Set(activeSuppliers.map((s: any) => s.id));
            removedSuppliersList = allSuppliers.filter((s: any) => !activeIds.has(s.id));
          }

          const activeSuppliersWithDocs = activeSuppliers.map((supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
            scorePercentage: supplier.scorePercentage || 0,
            responseCompletionPercentage:
              supplier.responseCompletionPercentage || 0,
            checkedResponses: supplier.checkedResponses || 0,
            totalResponses: supplier.totalResponses || 0,
            documents: supplier.documents || [],
            hasDocuments: (supplier.documents || []).length > 0,
            shortlist_status: "active" as const,
          }));

          const removedSuppliersWithDocs = removedSuppliersList.map((supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
            scorePercentage: supplier.scorePercentage || 0,
            responseCompletionPercentage:
              supplier.responseCompletionPercentage || 0,
            checkedResponses: supplier.checkedResponses || 0,
            totalResponses: supplier.totalResponses || 0,
            documents: supplier.documents || [],
            hasDocuments: (supplier.documents || []).length > 0,
            shortlist_status: "removed" as const,
          }));

          const sortedActiveSuppliers = [...activeSuppliersWithDocs].sort(
            (a, b) => b.scorePercentage - a.scorePercentage
          );
          const suppliersWithRanking = sortedActiveSuppliers.map((supplier, index) => ({
            ...supplier,
            ranking: index + 1,
          }));

          setSuppliers(suppliersWithRanking);
          setRemovedSuppliers(removedSuppliersWithDocs);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Une erreur est survenue"
          );
        } finally {
          setLoading(false);
        }
      };

      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Suppliers */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Fournisseurs actifs ({suppliers.length})
        </h3>
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
              <TableHead className="w-20">Actions</TableHead>
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
                      expandedSupplier === supplier.id ? null : supplier.id
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
                     <div className="flex items-center gap-1">
                       <Link
                         href={`/dashboard/rfp/${rfpId}/evaluate?supplierId=${supplier.id}`}
                         onClick={(e) => e.stopPropagation()}
                         title="Évaluer ce fournisseur"
                       >
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                           <Zap className="h-4 w-4 text-blue-600" />
                         </Button>
                       </Link>
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-8 w-8"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleSupplierStatus(
                             supplier.id,
                             supplier.name,
                             supplier.shortlist_status || "active"
                           );
                         }}
                         title="Supprimer ce fournisseur"
                       >
                         <Trash2 className="h-4 w-4 text-red-600" />
                       </Button>
                     </div>
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
          </TableBody>
        </Table>
      </div>
      </div>

      {/* Removed Suppliers */}
      {removedSuppliers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Fournisseurs supprimés ({removedSuppliers.length})
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Note précédente</TableHead>
                  <TableHead>Réponses complétées</TableHead>
                  <TableHead>Fichiers</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {removedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="opacity-60">
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-700">
                        {((supplier.scorePercentage / 100) * 20).toFixed(2)}/20
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          handleSupplierStatus(
                            supplier.id,
                            supplier.name,
                            supplier.shortlist_status || "removed"
                          )
                        }
                        title="Restaurer ce fournisseur"
                      >
                        <RotateCcw className="h-4 w-4 text-green-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Status Dialog */}
      <SupplierStatusDialog
        open={statusDialog.open}
        onOpenChange={(open) =>
          setStatusDialog((prev) => ({ ...prev, open }))
        }
        supplierId={statusDialog.supplierId}
        supplierName={statusDialog.supplierName}
        currentStatus={statusDialog.currentStatus}
        removalReason={statusDialog.removalReason}
        onSuccess={handleStatusSuccess}
      />
    </div>
  );
}
