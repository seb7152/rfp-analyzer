"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Supplier } from "@/types/supplier";

interface CategoryCardProps {
  categoryCode: string;
  categoryTitle: string;
  suppliers: Supplier[];
  scores: Record<string, number | null>; // supplierId -> score
  onClick?: () => void;
}

const getScoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-200";
  if (score >= 3.5) return "bg-emerald-600";
  if (score >= 3.0) return "bg-emerald-500";
  if (score >= 2.5) return "bg-emerald-400";
  if (score >= 2.0) return "bg-yellow-400";
  if (score >= 1.0) return "bg-orange-400";
  return "bg-red-500";
};

const getScoreTextColor = (score: number | null) => {
  if (score === null) return "text-slate-600";
  if (score >= 2.0) return "text-white";
  return "text-white";
};

export function CategoryCard({
  categoryCode,
  categoryTitle,
  suppliers,
  scores,
  onClick,
}: CategoryCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs mb-2 font-mono">
              {categoryCode}
            </Badge>
            <CardTitle className="text-sm line-clamp-2">
              {categoryTitle}
            </CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {suppliers.map((supplier) => {
          const score = scores[supplier.id];
          const percentage = score ? (score / 4) * 100 : 0;
          const bgColor = getScoreColor(score);
          const textColor = getScoreTextColor(score);

          return (
            <div
              key={supplier.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                {supplier.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Progress bar */}
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden flex items-center">
                  <div
                    className={cn("h-full transition-all", bgColor)}
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
                {/* Score - position based on bar width */}
                {score !== null ? (
                  <div className="w-12 text-right">
                    {percentage > 40 ? (
                      /* Inside bar if enough space */
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          percentage > 35 ? textColor : "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {score.toFixed(1)}
                      </span>
                    ) : (
                      /* Outside bar */
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {score.toFixed(1)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-12 text-right">
                    <span className="text-xs text-slate-500">-</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
