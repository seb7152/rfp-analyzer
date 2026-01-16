"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: number | null;
  onChange: (val: number | null) => void;
  isEditing: boolean;
  type: "currency" | "number";
  suffix?: string;
  isModified?: boolean;
}

export function EditableCell({
  value,
  onChange,
  isEditing,
  type,
  suffix,
  isModified,
}: EditableCellProps) {
  const [inputValue, setInputValue] = useState<string>("");

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value?.toString() ?? "");
    } else {
      // When entering edit mode, or receiving external update while editing (should not happen often if local state rules)
      // We only sync if the value is different to avoid cursor issues, but typically `value` comes from parent state which we just updated.
      setInputValue(value?.toString() ?? "");
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);

    if (newVal === "") {
      onChange(null);
    } else {
      const num = parseFloat(newVal);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="relative w-full">
        <Input
          type="number"
          value={inputValue}
          onChange={handleChange}
          className={cn(
            "h-8 text-right pr-2 text-xs",
            isModified && "border-blue-400 bg-blue-50",
            !inputValue && "opacity-50"
          )}
          placeholder="-"
        />
        {isModified && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 pointer-events-none" />
        )}
      </div>
    );
  }

  if (value === null || value === undefined)
    return <span className="text-gray-300 text-xs">-</span>;

  const formatted =
    type === "currency"
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(value)
      : value;

  return (
    <div className="text-right text-xs truncate">
      {formatted}{" "}
      {suffix && (
        <span className="text-[10px] text-gray-500 ml-0.5">{suffix}</span>
      )}
    </div>
  );
}
