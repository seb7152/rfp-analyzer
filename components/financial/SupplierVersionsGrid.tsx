"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FinancialTemplateLine,
  LineWithValues,
  buildLineTree,
  formatCurrency,
} from "@/lib/financial/calculations";
import { FinancialOfferValue, FinancialOfferVersion } from "@/types/financial";
import { useFinancialValues } from "@/hooks/use-financial-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { CommentPopover } from "./CommentPopover";

interface SupplierVersionsGridProps {
  rfpId: string;
  templateLines: FinancialTemplateLine[];
  supplierId: string;
  versions: FinancialOfferVersion[];
  tcoPeriod: number;
}

interface VersionTotals {
  versionId: string;
  versionName: string;
  versionDate: string | null;
  totalSetup: number;
  totalRecurrentAnnual: number;
  tco: number;
}

export function SupplierVersionsGrid({
  rfpId,
  templateLines,
  supplierId,
  versions,
  tcoPeriod,
}: SupplierVersionsGridProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  const { data: remoteValues = [] } = useFinancialValues(
    rfpId,
    "supplier",
    supplierId
  );
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // Sort versions by date (oldest first for comparison)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const dateA = a.version_date ? new Date(a.version_date).getTime() : 0;
      const dateB = b.version_date ? new Date(b.version_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [versions]);

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
  const versionTotals: VersionTotals[] = useMemo(() => {
    return sortedVersions.map((version) => {
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

      const safeTcoPeriod = isNaN(tcoPeriod) || tcoPeriod <= 0 ? 3 : tcoPeriod;
      const tco = totalSetup + totalRecurrentAnnual * safeTcoPeriod;

      return {
        versionId: version.id,
        versionName:
          version.version_name ||
          `Version ${sortedVersions.indexOf(version) + 1}`,
        versionDate: version.version_date,
        totalSetup,
        totalRecurrentAnnual,
        tco,
      };
    });
  }, [sortedVersions, valuesMap, templateLines, tcoPeriod]);

  // Expand all lines by default
  useEffect(() => {
    if (templateLines.length > 0 && expandedLines.size === 0) {
      setExpandedLines(new Set(templateLines.map((l) => l.id)));
    }
  }, [templateLines]);

  const handleToggleExpand = (lineId: string) => {
    const newSet = new Set(expandedLines);
    if (newSet.has(lineId)) newSet.delete(lineId);
    else newSet.add(lineId);
    setExpandedLines(newSet);
  };

  // Calculate line total recursively
  const calculateLineTotal = (
    line: LineWithValues,
    versionId: string,
    type: "setup" | "recurrent"
  ): number | null => {
    if (!line.children || line.children.length === 0) {
      const val = valuesMap.get(versionId)?.get(line.id);
      if (!val) return null;
      return type === "setup"
        ? (val.setup_cost ?? 0)
        : (val.recurrent_cost ?? 0);
    }

    let total = 0;
    let hasValue = false;

    for (const child of line.children) {
      const childTotal = calculateLineTotal(child, versionId, type);
      if (childTotal !== null) {
        total += childTotal;
        hasValue = true;
      }
    }

    return hasValue ? total : null;
  };

  const tree = useMemo(() => buildLineTree(templateLines), [templateLines]);

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        Aucune version disponible pour ce fournisseur.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto border rounded-md">
        <Table className="relative w-full min-w-[max-content]">
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[300px] min-w-[300px] pl-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ligne de coût
              </TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type
              </TableHead>
              {sortedVersions.map((version, idx) => (
                <TableHead
                  key={version.id}
                  className="min-w-[180px] p-0 align-top border-l bg-gray-50/30"
                >
                  <div className="p-3 space-y-1">
                    <div className="font-semibold text-slate-900 text-sm">
                      {version.version_name || `Version ${idx + 1}`}
                    </div>
                    {version.version_date && (
                      <div className="text-xs text-slate-500">
                        {new Date(version.version_date).toLocaleDateString(
                          "fr-FR"
                        )}
                      </div>
                    )}
                    {idx === 0 && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] bg-slate-100"
                      >
                        Référence
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderRows(
              tree,
              expandedLines,
              handleToggleExpand,
              sortedVersions,
              valuesMap,
              calculateLineTotal,
              0,
              currentUserId,
              rfpId
            )}

            {/* Totals Row */}
            <TableRow className="bg-slate-100/80 font-bold hover:bg-slate-100/80 border-t-2 border-slate-200">
              <TableCell className="pl-4 py-4">TOTAUX</TableCell>
              <TableCell className="py-4">-</TableCell>
              {versionTotals.map((totals, idx) => {
                const prevTotals = idx > 0 ? versionTotals[idx - 1] : null;

                return (
                  <TableCell
                    key={totals.versionId}
                    className="border-l p-4 min-w-[200px]"
                  >
                    <div className="space-y-2">
                      <TotalRow
                        label="Setup total:"
                        value={totals.totalSetup}
                        previousValue={prevTotals?.totalSetup}
                        showVariation={idx > 0}
                      />
                      <TotalRow
                        label="Récurrent total/an:"
                        value={totals.totalRecurrentAnnual}
                        previousValue={prevTotals?.totalRecurrentAnnual}
                        showVariation={idx > 0}
                        className="border-b border-slate-200 pb-1"
                      />
                      <TotalRow
                        label={`TCO (${tcoPeriod} ans):`}
                        value={totals.tco}
                        previousValue={prevTotals?.tco}
                        showVariation={idx > 0}
                        isTco
                      />
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Component to display a total row with optional variation
interface TotalRowProps {
  label: string;
  value: number;
  previousValue?: number;
  showVariation: boolean;
  isTco?: boolean;
  className?: string;
}

function TotalRow({
  label,
  value,
  previousValue,
  showVariation,
  isTco,
  className,
}: TotalRowProps) {
  const variation =
    showVariation && previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : null;

  return (
    <div
      className={cn(
        "flex justify-between items-center text-[11px] font-medium",
        isTco ? "text-[13px] font-bold text-slate-900 pt-1" : "text-slate-500",
        className
      )}
    >
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <span className={isTco ? "text-emerald-600" : "text-slate-900"}>
          {formatCurrency(value)}
        </span>
        {variation !== null && <VariationBadge variation={variation} />}
      </div>
    </div>
  );
}

// Component to display variation badge
interface VariationBadgeProps {
  variation: number;
}

export function VariationBadge({ variation }: VariationBadgeProps) {
  if (variation === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }

  const isIncrease = variation > 0;
  const formattedVariation = Math.abs(variation).toFixed(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
        isIncrease ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"
      )}
    >
      {isIncrease ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isIncrease ? "+" : "-"}
      {formattedVariation}%
    </span>
  );
}

// Helper to render rows recursively
function renderRows(
  lines: LineWithValues[],
  expanded: Set<string>,
  onToggle: (id: string) => void,
  versions: FinancialOfferVersion[],
  valuesMap: Map<string, Map<string, FinancialOfferValue>>,
  calculateTotal: (
    line: LineWithValues,
    versionId: string,
    type: "setup" | "recurrent"
  ) => number | null,
  depth: number = 0,
  currentUserId: string = "",
  rfpId: string = ""
): React.ReactNode[] {
  return lines.flatMap((line) => {
    const isExpanded = expanded.has(line.id);
    const hasChildren = line.children && line.children.length > 0;

    const row = (
      <TableRow
        key={line.id}
        className={cn(
          "hover:bg-slate-50/50 transition-colors",
          hasChildren &&
          "bg-slate-50/30 font-semibold text-slate-900 border-l-2 border-l-slate-200"
        )}
      >
        <TableCell className="py-2 pl-4">
          <div
            className="flex items-center min-w-0"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggle(line.id)}
                className="mr-2 p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase leading-none mb-1">
                {line.line_code}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm truncate font-medium">{line.name}</span>
                {line.description && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="focus:outline-none">
                        <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="w-80 p-3 text-xs bg-white/95 backdrop-blur shadow-lg border-slate-200 z-[100]"
                    >
                      <p className="font-mono text-[10px] font-bold text-slate-400 uppercase mb-1">
                        [{line.line_code}]
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        {line.description}
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-2 font-semibold uppercase tracking-tight",
              line.line_type === "setup"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {line.line_type === "setup" ? "Setup" : "Rec"}
          </Badge>
        </TableCell>

        {versions.map((version, versionIdx) => {
          const versionValues = valuesMap.get(version.id);
          const value = versionValues?.get(line.id);

          // Get previous version value for comparison
          const prevVersion = versionIdx > 0 ? versions[versionIdx - 1] : null;
          const prevValue = prevVersion
            ? valuesMap.get(prevVersion.id)?.get(line.id)
            : null;

          // Calculate total if parent
          const calculatedTotal = hasChildren
            ? calculateTotal(
              line as LineWithValues,
              version.id,
              line.line_type === "setup" ? "setup" : "recurrent"
            )
            : null;

          const prevCalculatedTotal =
            hasChildren && prevVersion
              ? calculateTotal(
                line as LineWithValues,
                prevVersion.id,
                line.line_type === "setup" ? "setup" : "recurrent"
              )
              : null;

          // Get current and previous values for leaf nodes
          const currentValue = hasChildren
            ? calculatedTotal
            : line.line_type === "setup"
              ? (value?.setup_cost ?? null)
              : (value?.recurrent_cost ?? null);

          const previousValue = hasChildren
            ? prevCalculatedTotal
            : line.line_type === "setup"
              ? (prevValue?.setup_cost ?? null)
              : (prevValue?.recurrent_cost ?? null);

          // Calculate variation
          const variation =
            versionIdx > 0 &&
              previousValue !== null &&
              previousValue !== 0 &&
              currentValue !== null
              ? ((currentValue - previousValue) / previousValue) * 100
              : null;

          return (
            <TableCell key={version.id} className="p-2 border-l align-middle">
              <div className="flex items-center justify-end gap-2 text-right">
                {hasChildren ? (
                  <span className="text-xs font-bold text-slate-900 px-3">
                    {calculatedTotal !== null
                      ? formatCurrency(calculatedTotal)
                      : "-"}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-700">
                      {currentValue !== null
                        ? formatCurrency(currentValue)
                        : "-"}
                    </span>
                    <CommentPopover
                      lineId={line.id}
                      versionId={version.id}
                      currentUserId={currentUserId}
                    />
                  </div>
                )}
                {variation !== null && <VariationBadge variation={variation} />}
              </div>
            </TableCell>
          );
        })}
      </TableRow>
    );

    if (isExpanded && hasChildren) {
      return [
        row,
        ...renderRows(
          line.children!,
          expanded,
          onToggle,
          versions,
          valuesMap,
          calculateTotal,
          depth + 1,
          currentUserId,
          rfpId
        ),
      ];
    }
    return [row];
  });
}
