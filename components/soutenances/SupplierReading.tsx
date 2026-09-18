"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Overview } from "@/hooks/use-soutenances";
import type { SyntheseDomain, SyntheseItem } from "@/lib/soutenance/types";

export function Delta({ value, mean, className }: { value: number | null; mean: number | null; className?: string }) {
  if (value === null || mean === null) return null;
  const d = value - mean;
  const flat = Math.abs(d) < 0.05;
  return (
    <span className={cn("num text-xs font-medium", flat ? "text-muted-foreground" : d > 0 ? "text-status-pass" : "text-status-fail", className)}>
      {flat ? "=" : d > 0 ? "+" : "−"}
      {flat ? "" : formatScore(Math.abs(d))}
    </span>
  );
}

const EMPTY: SyntheseDomain = { forces: [], faiblesses: [], questions: [] };

function itemsToText(items: SyntheseItem[]): string {
  return items.map((i) => (i.code ? `${i.code} — ${i.text}` : i.text)).join("\n");
}

function textToItems(text: string): SyntheseItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([A-Za-z0-9][\w.-]{0,30})\s*[—–:-]\s*(.+)$/);
      return m ? { code: m[1], text: m[2].trim() } : { code: "", text: l };
    });
}

function ItemList({ title, items, count }: { title: string; items: SyntheseItem[]; count?: string }) {
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {title}
        <span className="num font-medium">{count ?? items.length}</span>
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun point relevé.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i, idx) => (
            <li key={idx} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2 text-sm leading-[18px]">
              <span className="article-no pt-px">{i.code || "—"}</span>
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The reading of one supplier: its column is highlighted in the table
 * above; here each domain opens with its note, the retained suppliers' mean
 * and the gap, then the forces, weaknesses and questions to ask, editable
 * by the pilot. A domain without a notable gap is folded.
 */
export function SupplierReading({
  overview,
  supplierId,
  onSelect,
  canEdit,
  onSave,
  saving,
}: {
  overview: Overview;
  supplierId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onSave: (input: { supplier_id: string; category_id: string } & SyntheseDomain) => Promise<unknown>;
  saving: boolean;
}) {
  const retained = overview.suppliers.filter((s) => !s.removed);
  const removed = overview.suppliers.filter((s) => s.removed);
  const current = overview.suppliers.find((s) => s.id === supplierId) ?? retained[0] ?? null;
  const [openIds, setOpenIds] = useState<Set<string> | null>(null);
  const [editing, setEditing] = useState<{ domainId: string; title: string; forces: string; faiblesses: string; questions: string } | null>(null);

  if (!current) return null;
  const synth = overview.synthese?.data?.suppliers?.[current.id];
  const overall = overview.scores.overall.find((o) => o.supplierId === current.id);
  const counts = overview.scores.rows.reduce(
    (acc, row) => {
      const d = synth?.domains?.[row.id];
      acc.forces += d?.forces.length ?? 0;
      acc.faiblesses += d?.faiblesses.length ?? 0;
      acc.questions += d?.questions.length ?? 0;
      return acc;
    },
    { forces: 0, faiblesses: 0, questions: 0 }
  );
  const isOpen = (rowId: string, gap: number | null) => (openIds ? openIds.has(rowId) : gap === null || Math.abs(gap) >= 0.15 || overview.scores.rows.length <= 2);
  const toggle = (rowId: string, gap: number | null) => {
    const next = new Set(openIds ?? overview.scores.rows.filter((r) => isOpen(r.id, (r.cells[current.id]?.score ?? null) !== null && r.mean !== null ? (r.cells[current.id].score ?? 0) - r.mean : null)).map((r) => r.id));
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    setOpenIds(next);
    void gap;
  };

  const submit = async () => {
    if (!editing) return;
    try {
      await onSave({
        supplier_id: current.id,
        category_id: editing.domainId,
        forces: textToItems(editing.forces),
        faiblesses: textToItems(editing.faiblesses),
        questions: textToItems(editing.questions),
      });
      setEditing(null);
      toast.success("Synthèse modifiée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La modification n'a pas été enregistrée.");
    }
  };

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Lecture par fournisseur" className="flex gap-5 overflow-x-auto border-b border-border">
        {[...retained, ...removed].map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={s.id === current.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "-mb-px inline-flex h-9 items-center whitespace-nowrap border-b-2 px-0.5 text-sm font-medium transition-colors duration-150",
              s.id === current.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              s.removed && "opacity-50"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
        <span className="num text-[22px] font-semibold leading-6">
          {formatScore(overall?.score ?? null)}
          <span className="text-xs font-normal text-muted-foreground"> /5</span>
        </span>
        <span className="text-xs text-muted-foreground">
          moyenne des retenus <span className="num font-semibold text-foreground">{formatScore(overview.scores.overallMean)}</span> <Delta value={overall?.score ?? null} mean={overview.scores.overallMean} />
          {overall?.rank ? (
            <>
              {" "}
              · {overall.rank}
              <sup>{overall.rank === 1 ? "er" : "e"}</sup> sur {retained.length}
            </>
          ) : null}
          {current.removed ? ` · retiré de la version${current.removed.reason ? ` : « ${current.removed.reason} »` : ""}` : ""}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {synth ? `${counts.forces} forces · ${counts.faiblesses} faiblesses · ${counts.questions} questions à poser` : "pas encore de synthèse pour ce fournisseur"}
          {synth?.edited_at ? " · modifiée à la main" : ""}
        </span>
      </div>

      {overview.scores.rows.map((row) => {
        const c = row.cells[current.id];
        const gap = c?.score !== null && c?.score !== undefined && row.mean !== null ? c.score - row.mean : null;
        const open = isOpen(row.id, gap);
        const d = synth?.domains?.[row.id] ?? EMPTY;
        return (
          <section key={row.id} className="border-t border-border py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => toggle(row.id, gap)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <span className="article-no">{row.code}</span>
                <span className="truncate text-sm font-semibold">{row.title}</span>
                <span className="text-xs text-muted-foreground">
                  {row.requirementCount} exig.
                  {!open && synth ? ` · ${d.forces.length} forces · ${d.faiblesses.length} faiblesses · ${d.questions.length} question${d.questions.length > 1 ? "s" : ""}` : ""}
                </span>
              </button>
              <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span className="num text-sm font-semibold text-foreground">{formatScore(c?.score ?? null)}</span>
                moy. <span className="num font-semibold">{formatScore(row.mean)}</span>
                <Delta value={c?.score ?? null} mean={row.mean} />
              </span>
              {canEdit && open && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  mode="icon"
                  aria-label={`Modifier la synthèse du domaine ${row.code}`}
                  onClick={() => setEditing({ domainId: row.id, title: `${row.code} — ${row.title}`, forces: itemsToText(d.forces), faiblesses: itemsToText(d.faiblesses), questions: itemsToText(d.questions) })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {open && (
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <ItemList title="Forces" items={d.forces} />
                <ItemList title="Faiblesses" items={d.faiblesses} />
                <ItemList title="Questions à poser" items={d.questions} />
              </div>
            )}
          </section>
        );
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{current.name} · {editing?.title}</DialogTitle>
            <DialogDescription>Un point par ligne, le code de l&apos;exigence devant, séparé par un tiret : « L3.7 — Paiement des services en roadmap ».</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              {(["forces", "faiblesses", "questions"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`synth-${k}`}>{k === "forces" ? "Forces" : k === "faiblesses" ? "Faiblesses" : "Questions à poser"}</Label>
                  <Textarea id={`synth-${k}`} value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} className="min-h-[88px] text-sm" />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button type="button" disabled={saving} onClick={submit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
