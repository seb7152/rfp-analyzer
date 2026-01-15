"use client";

import { Card } from "@/components/ui/card";
import { FinancialSummaryData } from "@/types/financial-grid";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/financial/calculations";
import { ArrowDown, ArrowUp } from "lucide-react";

interface SummaryTableProps {
    data: FinancialSummaryData[];
    tcoPeriod: number;
}

export function SummaryTable({ data, tcoPeriod }: SummaryTableProps) {
    // Find minimum TCO for highlighting
    const minTco = Math.min(...data.map((d) => d.tco));

    if (data.length === 0) return null;

    return (
        <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 w-[200px]">
                                Totaux
                            </th>
                            {data.map((item) => (
                                <th
                                    key={item.supplier_id}
                                    className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100 min-w-[150px]"
                                >
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="truncate max-w-[150px]">{item.supplier_name}</span>
                                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                            {item.version_name}
                                        </span>
                                    </div>
                                </th>
                            ))}
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
                                    {formatCurrency(item.total_setup)}
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
                                    {formatCurrency(item.total_recurrent_annual)}
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
                                            {formatCurrency(item.tco)}
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
