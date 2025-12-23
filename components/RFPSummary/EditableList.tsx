"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableListProps {
  items: string[];
  itemType: "force" | "faiblesse";
  taskId?: string;
  onUpdate: (items: string[]) => Promise<void>;
  readOnly?: boolean;
}

export function EditableList({
  items,
  itemType,
  taskId,
  onUpdate,
  readOnly = false,
}: EditableListProps) {
  const [localItems, setLocalItems] = useState(items);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingIndex]);

  const icon = itemType === "force" ? "✓" : "✗";
  const hoverBgClass =
    itemType === "force" ? "hover:bg-green-50" : "hover:bg-red-50";
  const textColorClass =
    itemType === "force" ? "text-green-700" : "text-red-700";

  const handleEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleSave = async (index: number) => {
    if (isSaving) return;

    const trimmedValue = editValue.trim();

    // If empty, treat as delete
    if (!trimmedValue) {
      await handleDelete(index);
      return;
    }

    setIsSaving(true);
    const newItems = [...localItems];
    newItems[index] = trimmedValue;

    try {
      await onUpdate(newItems);
      setEditingIndex(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to save:", error);
      // Error is handled by parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleDelete = async (index: number) => {
    if (isSaving) return;

    setIsSaving(true);
    const newItems = localItems.filter((_, i) => i !== index);

    try {
      await onUpdate(newItems);
      setEditingIndex(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to delete:", error);
      // Error is handled by parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    const newIndex = localItems.length;
    setLocalItems([...localItems, ""]);
    setEditingIndex(newIndex);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave(index);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // Read-only mode
  if (readOnly || !taskId) {
    return localItems.length > 0 ? (
      <ul className="space-y-1 text-xs">
        {localItems.map((item, idx) => (
          <li key={idx} className="flex gap-2">
            <span className={cn("flex-shrink-0", textColorClass)}>{icon}</span>
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-slate-400 italic text-xs">À compléter</span>
    );
  }

  // Editable mode
  return (
    <div className="space-y-2">
      {localItems.map((item, idx) => (
        <div key={idx} className="group relative">
          {editingIndex === idx ? (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="text-xs min-h-[60px] pr-8"
                disabled={isSaving}
                placeholder={
                  itemType === "force"
                    ? "Entrez une force..."
                    : "Entrez une faiblesse..."
                }
              />
              {isSaving && (
                <div className="absolute top-2 right-2">
                  <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "flex gap-2 items-start p-2 rounded cursor-pointer transition-colors",
                hoverBgClass
              )}
            >
              <span className={cn("flex-shrink-0 mt-0.5", textColorClass)}>
                {icon}
              </span>
              <span
                className="flex-1 break-words text-xs"
                onClick={() => handleEdit(idx, item)}
              >
                {item}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(idx);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                disabled={isSaving}
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700" />
              </button>
            </div>
          )}
        </div>
      ))}

      {localItems.length === 0 && editingIndex === null && (
        <span className="text-slate-400 italic text-xs">À compléter</span>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleAdd}
        disabled={isSaving || editingIndex !== null}
        className="text-xs h-7 px-2"
      >
        <Plus className="w-3 h-3 mr-1" />
        Ajouter {itemType === "force" ? "une force" : "une faiblesse"}
      </Button>
    </div>
  );
}
