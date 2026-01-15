"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FinancialGridUIMode } from "@/types/financial-grid";
import { Columns, User } from "lucide-react";

interface ModeSelectorProps {
    mode: FinancialGridUIMode;
    onChange: (mode: FinancialGridUIMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
    return (
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange("comparison")}
                className={cn(
                    "flex items-center gap-2 px-3 text-xs font-medium",
                    mode === "comparison"
                        ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                )}
            >
                <Columns className="h-3.5 w-3.5" />
                Comparaison
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange("supplier")}
                className={cn(
                    "flex items-center gap-2 px-3 text-xs font-medium",
                    mode === "supplier"
                        ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                )}
            >
                <User className="h-3.5 w-3.5" />
                Par fournisseur
            </Button>
        </div>
    );
}
