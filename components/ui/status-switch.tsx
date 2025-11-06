import React from "react";
import { CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface StatusSwitchProps {
  value?: "pass" | "partial" | "fail" | "pending";
  onChange?: (value: "pass" | "partial" | "fail" | "pending") => void;
  disabled?: boolean;
}

const statuses = [
  { value: "pending", label: "Attente", icon: Clock },
  { value: "pass", label: "Conforme", icon: CheckCircle2 },
  { value: "partial", label: "Partiel", icon: Zap },
  { value: "fail", label: "Non conforme", icon: AlertCircle },
];

export function StatusSwitch({ value = "pending", onChange, disabled = false }: StatusSwitchProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onChange?.(newValue as "pass" | "partial" | "fail" | "pending");
        }
      }}
      disabled={disabled}
      variant="outline"
      className="gap-2"
    >
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <ToggleGroupItem
            key={status.value}
            value={status.value}
            className="px-3 py-2 flex items-center gap-2 text-xs font-medium data-[state=on]:bg-slate-900 dark:data-[state=on]:bg-white data-[state=on]:text-white dark:data-[state=on]:text-slate-900"
          >
            <Icon className="w-4 h-4" />
            <span>{status.label}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
