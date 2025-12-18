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
  activeFilterCount?: number;
}

export function EvaluationFilters({
  filters,
  onFiltersChange,
  activeFilterCount = 0,
}: EvaluationFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);

    onFiltersChange({
      ...filters,
      status: newStatus,
    });
  };

  const handleScoreRangeChange = (
    field: "min" | "max",
    value: string
  ) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    onFiltersChange({
      ...filters,
      scoreRange: {
        ...filters.scoreRange,
        [field]: numValue,
      },
    });
  };

  const handleCheckboxChange = (
    field: "hasQuestions" | "hasManualComments" | "hasManualScore",
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
      scoreRange: { min: 0, max: 100 },
      hasQuestions: null,
      hasManualComments: null,
      hasManualScore: null,
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.scoreRange.min > 0 ||
    filters.scoreRange.max < 100 ||
    filters.hasQuestions !== null ||
    filters.hasManualComments !== null ||
    filters.hasManualScore !== null;

  return (
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
      <PopoverContent className="w-80 p-4">
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

          {/* Score Range Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Score (0-100)</Label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="100"
                value={filters.scoreRange.min}
                onChange={(e) => handleScoreRangeChange("min", e.target.value)}
                className="w-16 px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <span className="text-xs text-slate-500 flex-shrink-0">à</span>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.scoreRange.max}
                onChange={(e) => handleScoreRangeChange("max", e.target.value)}
                className="w-16 px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Questions Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Questions</Label>
            <div className="flex gap-2">
              <Button
                variant={filters.hasQuestions === true ? "secondary" : "outline"}
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
                variant={filters.hasQuestions === false ? "secondary" : "outline"}
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

          {/* Manual Score Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Score manuel</Label>
            <div className="flex gap-2">
              <Button
                variant={filters.hasManualScore === true ? "secondary" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasManualScore",
                    filters.hasManualScore === true ? null : true
                  )
                }
              >
                Avec
              </Button>
              <Button
                variant={
                  filters.hasManualScore === false ? "secondary" : "outline"
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() =>
                  handleCheckboxChange(
                    "hasManualScore",
                    filters.hasManualScore === false ? null : false
                  )
                }
              >
                Sans
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
