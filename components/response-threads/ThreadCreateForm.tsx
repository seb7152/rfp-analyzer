"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadPriority } from "@/types/response-thread";

interface ThreadCreateFormProps {
  onSubmit: (data: {
    title?: string;
    content: string;
    priority: ThreadPriority;
  }) => void;
  isPending?: boolean;
}

const PRIORITY_OPTIONS: {
  value: ThreadPriority;
  label: string;
  color: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    color:
      "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  },
  {
    value: "important",
    label: "Important",
    color:
      "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700",
  },
  {
    value: "blocking",
    label: "Bloquant",
    color:
      "bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700",
  },
];

export function ThreadCreateForm({
  onSubmit,
  isPending,
}: ThreadCreateFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<ThreadPriority>("normal");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({
      title: title.trim() || undefined,
      content: content.trim(),
      priority,
    });
    // Reset form
    setTitle("");
    setContent("");
    setPriority("normal");
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTitle("");
    setContent("");
    setPriority("normal");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full text-xs"
      >
        <Plus size={14} className="mr-1" />
        Nouveau point de discussion
      </Button>
    );
  }

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3 bg-blue-50/30 dark:bg-blue-950/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Nouveau point de discussion
        </span>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Title (optional) */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (optionnel)"
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white placeholder:text-gray-400"
        disabled={isPending}
      />

      {/* Content (required) */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Décrivez le point de discussion..."
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white resize-none placeholder:text-gray-400"
        rows={3}
        disabled={isPending}
        autoFocus
      />

      {/* Priority selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">Priorité :</span>
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPriority(opt.value)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                priority === opt.value
                  ? opt.color + " ring-1 ring-offset-1"
                  : "bg-white dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              disabled={isPending}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
        >
          {isPending ? "Création..." : "Créer"}
        </Button>
      </div>
    </div>
  );
}
