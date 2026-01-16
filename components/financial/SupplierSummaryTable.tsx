"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/financial/calculations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface VersionSummary {
  versionId: string;
  versionName: string;
  versionDate: string | null;
  totalSetup: number;
  totalRecurrentAnnual: number;
  tco: number;
}

interface SupplierSummaryTableProps {
  data: VersionSummary[];
  tcoPeriod: number;
  supplierName: string;
}

function calculateVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function VariationCell({ variation }: { variation: number | null }) {
  if (variation === null) return <span className="text-slate-400">-</span>;

  if (variation === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-500">
        <Minus className="h-3.5 w-3.5" />
        <span>0%</span>
      </span>
    );
  }

  const isIncrease = variation > 0;
  const formattedVariation = Math.abs(variation).toFixed(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        isIncrease ? "text-red-600" : "text-emerald-600"
      )}
    >
      {isIncrease ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      <span>
        {isIncrease ? "+" : "-"}
        {formattedVariation}%
      </span>
    </span>
  );
}

export function SupplierSummaryTable({
  data,
  tcoPeriod,
  supplierName,
}: SupplierSummaryTableProps) {
  if (data.length === 0) return null;

  // Find best TCO (lowest)
  const minTco = Math.min(...data.map((d) => d.tco));

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700">
          Évolution des Versions - {supplierName}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Comparaison des coûts entre les différentes versions de l'offre
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 min-w-[160px]">
                Version
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 min-w-[100px]">
                Date
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 min-w-[130px]">
                Total Setup
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 min-w-[130px]">
                Total Récurrent/an
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 min-w-[130px]">
                TCO ({tcoPeriod} ans)
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 min-w-[120px]">
                Variation TCO
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((item, idx) => {
              const prevItem = idx > 0 ? data[idx - 1] : null;
              const tcoVariation = prevItem
                ? calculateVariation(item.tco, prevItem.tco)
                : null;
              const setupVariation = prevItem
                ? calculateVariation(item.totalSetup, prevItem.totalSetup)
                : null;
              const recurrentVariation = prevItem
                ? calculateVariation(
                    item.totalRecurrentAnnual,
                    prevItem.totalRecurrentAnnual
                  )
                : null;
              const isBest = item.tco === minTco && data.length > 1;
              const isFirst = idx === 0;

              return (
                <tr
                  key={item.versionId}
                  className={cn(
                    "group transition-colors",
                    isBest && "bg-emerald-50/30",
                    !isBest && "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {item.versionName}
                      </span>
                      {isFirst && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
                          Réf
                        </span>
                      )}
                      {isBest && !isFirst && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                          Meilleur
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {item.versionDate
                      ? new Date(item.versionDate).toLocaleDateString("fr-FR")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.totalSetup)}
                      </span>
                      {setupVariation !== null && (
                        <span className="text-xs">
                          <VariationCell variation={setupVariation} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.totalRecurrentAnnual)}
                      </span>
                      {recurrentVariation !== null && (
                        <span className="text-xs">
                          <VariationCell variation={recurrentVariation} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold",
                      isBest
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {formatCurrency(item.tco)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VariationCell variation={tcoVariation} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
