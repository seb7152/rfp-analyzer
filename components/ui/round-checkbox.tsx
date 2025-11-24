import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoundCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function RoundCheckbox({
  checked = false,
  onChange,
  disabled = false,
  className = "",
}: RoundCheckboxProps) {
  return (
    <button
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
        checked
          ? "bg-green-500 border-green-500"
          : "border-slate-400 dark:border-slate-500 hover:border-slate-500 dark:hover:border-slate-400",
        checked ? "border-solid" : "border-dashed",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !checked && "cursor-pointer",
        !disabled && checked && "cursor-pointer",
        className
      )}
    >
      {checked && <Check className="w-2 h-2 text-white" />}
    </button>
  );
}
