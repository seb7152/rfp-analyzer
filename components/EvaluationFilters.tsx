"use client";

import React, { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientOnly } from "@/components/ClientOnly";

export interface EvaluationFilterState {
  status: string[]; // "pass", "partial", "fail", "pending"
  scoreRange: {
    min: number;
    max: number;
  };
  hasQuestions: boolean | null;
  hasManualComments: boolean | null;
  hasManualScore: boolean | null;
}

interface EvaluationFiltersProps {
  filters: EvaluationFilterState;
  onFiltersChange: (filters: EvaluationFilterState) => void;
  onApplyFilters: () => void;
  activeFilterCount?: number;
}

export function EvaluationFilters({
  filters,
  onFiltersChange,
  onApplyFilters,
  activeFilterCount = 0,
}: EvaluationFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleApplyFilters = () => {
    onApplyFilters();
    setIsOpen(false);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);

    onFiltersChange({
      ...filters,
      status: newStatus,
    });
  };

  const handleScoreRangeChange = (field: "min" | "max", value: string) => {
    const numValue = Math.max(0, Math.min(5, parseInt(value) || 0));
    onFiltersChange({
      ...filters,
      scoreRange: {
        ...filters.scoreRange,
        [field]: numValue,
      },
    });
  };

  const handleCheckboxChange = (
    field: "hasQuestions" | "hasManualComments",
    checked: boolean | null
  ) => {
    onFiltersChange({
      ...filters,
      [field]: checked,
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      status: [],
      scoreRange: { min: 0, max: 5 },
      hasQuestions: null,
      hasManualComments: null,
      hasManualScore: null,
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.scoreRange.min > 0 ||
    filters.scoreRange.max < 5 ||
    filters.hasQuestions !== null ||
    filters.hasManualComments !== null;

  return (
    <ClientOnly>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Filtrer les requirements"
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(
        "p-4",
        isMobile ? "w-[calc(100vw-2rem)] max-w-sm" : "w-80"
      )}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">Filtres</h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex-shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Statut</Label>
            <div className="space-y-2">
              {[
                { value: "pass", label: "Conforme ✓" },
                { value: "partial", label: "Partiel ≈" },
                { value: "fail", label: "Non-conforme ✗" },
                { value: "pending", label: "En attente ⏳" },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${value}`}
                    checked={filters.status.includes(value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`status-${value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Score Range Filter (1-5 stars) */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Score</Label>
            <div className={cn(
              "items-center",
              isMobile ? "space-y-2" : "flex gap-2"
            )}>
              <div className={isMobile ? "w-full" : "flex-1"}>
                <label className="text-xs text-slate-600 dark:text-slate-400">Min</label>
                <select
                  value={filters.scoreRange.min}
                  onChange={(e) => handleScoreRangeChange("min", e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="0">Min</option>
                  <option value="1">1 ⭐</option>
                  <option value="2">2 ⭐</option>
                  <option value="3">3 ⭐</option>
                  <option value="4">4 ⭐</option>
                  <option value="5">5 ⭐</option>
                </select>
              </div>
              {!isMobile && <span className="text-xs text-slate-500 flex-shrink-0">à</span>}
              <div className={isMobile ? "w-full" : "flex-1"}>
                <label className="text-xs text-slate-600 dark:text-slate-400">Max</label>
                <select
                  value={filters.scoreRange.max}
                  onChange={(e) => handleScoreRangeChange("max", e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="1">1 ⭐</option>
                  <option value="2">2 ⭐</option>
                  <option value="3">3 ⭐</option>
                  <option value="4">4 ⭐</option>
                  <option value="5">5 ⭐</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Questions</Label>
            <div className="flex gap-2">
              <Button
                variant={
                  filters.hasQuestions === true ? "secondary" : "outline"
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasQuestions",
                    filters.hasQuestions === true ? null : true
                  )
                }
              >
                Avec
              </Button>
              <Button
                variant={
                  filters.hasQuestions === false ? "secondary" : "outline"
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasQuestions",
                    filters.hasQuestions === false ? null : false
                  )
                }
              >
                Sans
              </Button>
            </div>
          </div>

          {/* Manual Comments Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Commentaires</Label>
            <div className="flex gap-2">
              <Button
                variant={
                  filters.hasManualComments === true ? "secondary" : "outline"
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasManualComments",
                    filters.hasManualComments === true ? null : true
                  )
                }
              >
                Avec
              </Button>
              <Button
                variant={
                  filters.hasManualComments === false ? "secondary" : "outline"
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasManualComments",
                    filters.hasManualComments === false ? null : false
                  )
                }
              >
                Sans
              </Button>
            </div>
          </div>

          {/* Apply Filters Button */}
          <Button onClick={handleApplyFilters} className="w-full" size="sm">
            Filtrer
          </Button>
        </div>
      </PopoverContent>
      </Popover>
    </ClientOnly>
  );
}
