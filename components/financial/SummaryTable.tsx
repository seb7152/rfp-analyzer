"use client";

import { Card } from "@/components/ui/card";
import { FinancialSummaryData } from "@/types/financial-grid";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/financial/calculations";
import { ArrowDown, CheckCircle2 } from "lucide-react";

interface SummaryTableProps {
  data: FinancialSummaryData[];
  tcoPeriod: number;
  referenceSupplierId: string | null;
  onSupplierHeaderClick: (supplierId: string) => void;
}

export function SummaryTable({
  data,
  tcoPeriod,
  referenceSupplierId,
  onSupplierHeaderClick,
}: SummaryTableProps) {
  // Find minimum TCO for highlighting
  const minTco = Math.min(...data.map((d) => d.tco));
  const referenceData = data.find((d) => d.supplier_id === referenceSupplierId);

  if (data.length === 0) return null;

  const renderDiff = (value: number, refValue: number) => {
    if (Math.abs(refValue) < 0.01) return null; // Avoid division by zero
    const diff = (value - refValue) / refValue;
    const isPositive = diff > 0;
    const isZero = Math.abs(diff) < 0.001;

    if (isZero)
      return <span className="text-[10px] font-medium text-slate-400">-</span>;

    return (
      <span
        className={cn(
          "text-[10px] font-medium ml-1.5",
          isPositive ? "text-red-600" : "text-emerald-600"
        )}
      >
        {isPositive ? "+" : ""}
        {new Intl.NumberFormat("fr-FR", {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(diff)}
      </span>
    );
  };

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 w-[200px]">
                Totaux
              </th>
              {data.map((item) => {
                const isRef = item.supplier_id === referenceSupplierId;
                return (
                  <th
                    key={item.supplier_id}
                    className={cn(
                      "px-4 py-3 text-right font-medium min-w-[150px] cursor-pointer hover:bg-slate-100/80 transition-colors relative group select-none",
                      isRef
                        ? "text-blue-700 bg-blue-50/50 hover:bg-blue-50/80"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                    onClick={() => onSupplierHeaderClick(item.supplier_id)}
                    title={
                      isRef
                        ? "Désélectionner la référence"
                        : "Définir comme référence"
                    }
                  >
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        {isRef && (
                          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Ref
                          </span>
                        )}
                        <span className="truncate max-w-[150px]">
                          {item.supplier_name}
                        </span>
                      </div>
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {item.version_name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Setup Costs */}
            <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Total Setup (One-shot)
              </td>
              {data.map((item) => (
                <td
                  key={item.supplier_id}
                  className="px-4 py-3 text-right text-slate-600 dark:text-slate-300"
                >
                  <div className="flex items-center justify-end">
                    {formatCurrency(item.total_setup)}
                    {referenceData &&
                      item.supplier_id !== referenceSupplierId &&
                      renderDiff(
                        item.total_setup,
                        referenceData.total_setup
                      )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Recurrent Costs */}
            <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                Total Récurrent / an
              </td>
              {data.map((item) => (
                <td
                  key={item.supplier_id}
                  className="px-4 py-3 text-right text-slate-600 dark:text-slate-300"
                >
                  <div className="flex items-center justify-end">
                    {formatCurrency(item.total_recurrent_annual)}
                    {referenceData &&
                      item.supplier_id !== referenceSupplierId &&
                      renderDiff(
                        item.total_recurrent_annual,
                        referenceData.total_recurrent_annual
                      )}
                  </div>
                </td>
              ))}
            </tr>

            {/* TCO */}
            <tr className="bg-slate-50/50 dark:bg-slate-900/20 font-semibold">
              <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                TCO ({tcoPeriod} ans)
              </td>
              {data.map((item) => {
                const isBest = item.tco === minTco;
                return (
                  <td
                    key={item.supplier_id}
                    className={cn(
                      "px-4 py-3 text-right transition-colors",
                      isBest
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center">
                        {formatCurrency(item.tco)}
                        {referenceData &&
                          item.supplier_id !== referenceSupplierId &&
                          renderDiff(item.tco, referenceData.tco)}
                      </div>
                      {isBest && data.length > 1 && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <ArrowDown className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
