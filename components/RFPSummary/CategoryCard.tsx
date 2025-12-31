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
  if (score === null) return "bg-slate-200 text-slate-600";
  if (score >= 3.5) return "bg-emerald-600 text-white";
  if (score >= 3.0) return "bg-emerald-500 text-white";
  if (score >= 2.5) return "bg-emerald-400 text-white";
  if (score >= 2.0) return "bg-yellow-400 text-slate-900";
  if (score >= 1.0) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs font-mono">
              {categoryCode}
            </Badge>
            <CardTitle className="text-sm line-clamp-1">
              {categoryTitle}
            </CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {suppliers.map((supplier) => {
          const score = scores[supplier.id];

          return (
            <div
              key={supplier.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                {supplier.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Score badge */}
                {score !== null ? (
                  <div
                    className={cn(
                      "w-16 h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm",
                      getScoreColor(score)
                    )}
                  >
                    {score.toFixed(1)}
                  </div>
                ) : (
                  <div className="w-16 h-8 rounded flex items-center justify-center text-xs font-bold bg-slate-200 text-slate-600 shadow-sm">
                    -
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
