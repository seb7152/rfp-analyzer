"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  isPending?: boolean;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  isPending,
  placeholder = "Répondre...",
}: CommentInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white resize-none placeholder:text-gray-400"
        rows={2}
        disabled={isPending}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!content.trim() || isPending}
        className="shrink-0"
      >
        <Send size={14} />
      </Button>
    </div>
  );
}
