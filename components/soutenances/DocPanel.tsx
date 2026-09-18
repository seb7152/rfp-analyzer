"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Copy, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadDocx } from "@/hooks/use-soutenances";
import { MarkdownDoc } from "./MarkdownDoc";
import { cn } from "@/lib/utils";

/**
 * A step of the séance: a panel with its state dot, its title, a state line
 * and its actions; the body is the step's own. Shared by the four steps so
 * they read as one sequence.
 */
export function StepPanel({
  id,
  title,
  dot,
  state,
  actions,
  children,
}: {
  id: string;
  title: string;
  dot: "done" | "now" | "todo";
  state: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="panel mx-4 scroll-mt-4 md:mx-8" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dot === "done" ? "bg-status-pass" : dot === "now" ? "bg-status-partial" : "border-[1.5px] border-input")} aria-hidden />
        <h2 id={`${id}-title`} className="whitespace-nowrap text-base font-semibold">
          {title}
        </h2>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{state}</span>
        {actions && <span className="flex flex-wrap items-center gap-1.5">{actions}</span>}
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 md:px-5">{children}</div>
    </section>
  );
}

/**
 * A generated document the pilot can correct: read as Markdown, edited as
 * text, copied, downloaded as Word. Saving is the caller's.
 */
export function EditableDoc({
  content,
  title,
  canEdit,
  onSave,
  saving,
  emptyText,
}: {
  content: string | null;
  title: string;
  canEdit: boolean;
  onSave: (markdown: string) => Promise<unknown>;
  saving: boolean;
  emptyText: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content ?? "");
  useEffect(() => {
    if (!editing) setDraft(content ?? "");
  }, [content, editing]);

  const copy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success("Copié.");
  };
  const download = async () => {
    if (!content) return;
    try {
      await downloadDocx(content, title);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible.");
    }
  };
  const save = async () => {
    try {
      await onSave(draft);
      setEditing(false);
      toast.success("Enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Non enregistré.");
    }
  };

  if (!content && !editing) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-2">
      {editing ? (
        <>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[420px] font-mono text-xs leading-[18px]" aria-label={`Modifier : ${title}`} />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="button" size="sm" disabled={saving || !draft.trim()} onClick={save}>
              Enregistrer
            </Button>
          </div>
        </>
      ) : (
        <>
          <MarkdownDoc content={content ?? ""} />
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
            {canEdit && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
            <Button type="button" variant="ghost" size="xs" onClick={copy}>
              <Copy className="h-3.5 w-3.5" />
              Copier
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={download}>
              <Download className="h-3.5 w-3.5" />
              .docx
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
