"use client";

import { useState, useMemo } from "react";
import { Grid, GitCompare } from "lucide-react";
import { FinancialTemplateLine } from "@/lib/financial/calculations";
import { FinancialOfferVersion, FinancialOfferValue } from "@/types/financial";
import { useFinancialValues } from "@/hooks/use-financial-data";
import { SupplierSelector } from "./SupplierSelector";
import { SupplierVersionsGrid } from "./SupplierVersionsGrid";
import { SupplierSummaryTable } from "./SupplierSummaryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupplierModeContentProps {
  rfpId: string;
  templateLines: FinancialTemplateLine[];
  suppliers: { id: string; name: string }[];
  allVersions: FinancialOfferVersion[];
  selectedSupplierId: string | null;
  onSupplierChange: (supplierId: string) => void;
  tcoPeriod: number;
}

interface VersionSummary {
  versionId: string;
  versionName: string;
  versionDate: string | null;
  totalSetup: number;
  totalRecurrentAnnual: number;
  tco: number;
}

export function SupplierModeContent({
  rfpId,
  templateLines,
  suppliers,
  allVersions,
  selectedSupplierId,
  onSupplierChange,
  tcoPeriod,
}: SupplierModeContentProps) {
  // State for reference version
  const [referenceVersionId, setReferenceVersionId] = useState<string | null>(
    null
  );

  // Effective supplier ID (default to first if not set)
  const effectiveSupplierId =
    selectedSupplierId || (suppliers.length > 0 ? suppliers[0].id : null);
  const selectedSupplier = suppliers.find((s) => s.id === effectiveSupplierId);
  const supplierVersions = allVersions.filter(
    (v) => v.supplier_id === effectiveSupplierId
  );

  // Fetch financial values for the selected supplier
  const { data: remoteValues = [] } = useFinancialValues(
    rfpId,
    "supplier",
    effectiveSupplierId || undefined
  );

  // Sort versions by date (oldest first)
  const sortedVersions = useMemo(() => {
    return [...supplierVersions].sort((a, b) => {
      const dateA = a.version_date ? new Date(a.version_date).getTime() : 0;
      const dateB = b.version_date ? new Date(b.version_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [supplierVersions]);

  // Determine effective reference version (default to oldest if not set)
  const effectiveReferenceId = useMemo(() => {
    if (
      referenceVersionId &&
      sortedVersions.some((v) => v.id === referenceVersionId)
    ) {
      return referenceVersionId;
    }
    return sortedVersions[0]?.id || null;
  }, [referenceVersionId, sortedVersions]);

  // Build values map: versionId -> templateLineId -> Value
  const valuesMap = useMemo(() => {
    const map = new Map<string, Map<string, FinancialOfferValue>>();
    remoteValues.forEach((v) => {
      if (!map.has(v.version_id)) map.set(v.version_id, new Map());
      map.get(v.version_id)!.set(v.template_line_id, v);
    });
    return map;
  }, [remoteValues]);

  // Calculate totals for each version
  const versionTotals: VersionSummary[] = useMemo(() => {
    const safeTcoPeriod = isNaN(tcoPeriod) || tcoPeriod <= 0 ? 3 : tcoPeriod;

    return sortedVersions.map((version, idx) => {
      let totalSetup = 0;
      let totalRecurrentAnnual = 0;

      const versionValues = valuesMap.get(version.id);
      if (versionValues) {
        templateLines.forEach((line) => {
          const isLeaf = !templateLines.some((l) => l.parent_id === line.id);
          if (isLeaf) {
            const val = versionValues.get(line.id);
            if (val) {
              const qty = Number(val.quantity ?? 1);
              if (line.line_type === "setup") {
                totalSetup += Number(val.setup_cost || 0) * qty;
              } else if (line.line_type === "recurrent") {
                let annualCost = Number(val.recurrent_cost || 0) * qty;
                if (line.recurrence_type === "monthly") {
                  annualCost *= 12;
                }
                totalRecurrentAnnual += annualCost;
              }
            }
          }
        });
      }

      const tco = totalSetup + totalRecurrentAnnual * safeTcoPeriod;

      return {
        versionId: version.id,
        versionName: version.version_name || `Version ${idx + 1}`,
        versionDate: version.version_date,
        totalSetup,
        totalRecurrentAnnual,
        tco,
      };
    });
  }, [sortedVersions, valuesMap, templateLines, tcoPeriod]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Supplier and Reference Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-center">
        <SupplierSelector
          suppliers={suppliers}
          selectedSupplierId={effectiveSupplierId}
          onChange={onSupplierChange}
        />

        {effectiveSupplierId && sortedVersions.length > 0 && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-slate-500" />
              Référence :
            </label>
            <Select
              value={effectiveReferenceId || ""}
              onValueChange={setReferenceVersionId}
            >
              <SelectTrigger className="w-[200px] bg-white border-slate-200 text-sm shadow-sm">
                <SelectValue placeholder="Choisir une version" />
              </SelectTrigger>
              <SelectContent>
                {sortedVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="font-medium">
                      {v.version_name || "Sans nom"}
                    </span>
                    <span className="text-slate-400 ml-2 text-xs">
                      {v.version_date
                        ? new Date(v.version_date).toLocaleDateString()
                        : "-"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {effectiveSupplierId && selectedSupplier && (
        <>
          {/* Summary Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Évolution des Versions
              </h3>
            </div>
            <SupplierSummaryTable
              data={versionTotals}
              tcoPeriod={tcoPeriod}
              supplierName={selectedSupplier.name}
              referenceVersionId={effectiveReferenceId}
            />
          </div>

          {/* Main Grid Section */}
          <div className="space-y-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Détail des Coûts par Version
              </h3>
            </div>
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xl overflow-hidden flex-1 flex flex-col min-h-[500px]">
              <SupplierVersionsGrid
                rfpId={rfpId}
                templateLines={templateLines}
                supplierId={effectiveSupplierId}
                versions={supplierVersions}
                tcoPeriod={tcoPeriod}
              />
            </div>
          </div>
        </>
      )}

      {(!effectiveSupplierId || suppliers.length === 0) && (
        <div className="flex-1 flex items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-center space-y-4 max-w-md">
            <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto">
              <Grid className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              Aucun fournisseur sélectionné
            </h3>
            <p className="text-slate-500">
              Sélectionnez un fournisseur pour voir l'évolution de ses
              différentes versions d'offre.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
