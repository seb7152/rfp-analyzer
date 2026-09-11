"use client";

import { useEffect, useRef } from "react";
import { Search, SlidersHorizontal, MessageSquare, HelpCircle, StickyNote, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { useEvaluationQueue, QueueItem } from "@/hooks/use-evaluation-queue";
import { STATUS_META, STATUS_ORDER, type ResponseStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Queue = ReturnType<typeof useEvaluationQueue>;

interface WorkQueueProps {
  queue: Queue;
  suppliers: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  reviewStatusOf?: (id: string) => "draft" | "submitted" | "approved" | "rejected" | null;
  openThreadIds: Set<string>;
  className?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function Progress({ item }: { item: QueueItem }) {
  if (item.total === 0) return <span className="text-2xs text-muted-foreground">—</span>;
  const done = item.checked === item.total;
  return (
    <span
      className={cn("tnum text-2xs", done ? "text-status-pass" : "text-muted-foreground")}
      aria-label={`${item.checked} réponses évaluées sur ${item.total}`}
    >
      {item.checked}/{item.total}
    </span>
  );
}

const REVIEW_LABEL = {
  draft: "",
  submitted: "Soumise",
  approved: "Validée",
  rejected: "Rejetée",
};

/**
 * The expert's work queue: what remains, what is done, filtered to what is
 * theirs to do. Rows are dense; the selection is a 2 px ink rule.
 */
export function WorkQueue({
  queue,
  suppliers,
  selectedId,
  onSelect,
  reviewStatusOf,
  openThreadIds,
  className,
  collapsed = false,
  onToggleCollapsed,
}: WorkQueueProps) {
  const { tab, setTab, filters, setFilters, resetFilters, activeFilterCount, groups, counts, domains } = queue;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (collapsed) {
    const label = tab === "todo" ? "À faire" : tab === "done" ? "Faites" : "Toutes";
    return (
      <div className={cn("flex h-full flex-col items-center gap-3 bg-rail py-3", className)}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Déplier la file de travail"
          title="Déplier la file de travail (])"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
        <span className="num inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground" title={`${counts.todo} exigences à faire`}>
          {counts.todo}
        </span>
        <span className="text-2xs uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          {label} · {tab === "todo" ? counts.todo : tab === "done" ? counts.done : counts.all} sur {counts.all}
        </span>
      </div>
    );
  }


  const tabs: Array<{ id: typeof tab; label: string; count: number }> = [
    { id: "todo", label: "À faire", count: counts.todo },
    { id: "done", label: "Faites", count: counts.done },
    { id: "all", label: "Toutes", count: counts.all },
  ];

  return (
    <div className={cn("flex h-full flex-col bg-rail", className)}>
      <div className="flex items-end gap-2 border-b border-border px-3 pt-2">
        <div role="tablist" aria-label="File de travail" className="flex flex-1 gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 pb-1.5 text-sm transition-colors duration-150",
                tab === t.id ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} <span className="tnum text-xs text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Replier la file de travail"
            title="Replier la file de travail (])"
            className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher une exigence"
            placeholder="Code ou intitulé"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-8 pl-7 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={activeFilterCount > 0 ? "primary" : "outline"} size="sm" className="h-8 gap-1 px-2" aria-label="Filtres">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount > 0 && <span className="tnum text-xs">{activeFilterCount}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-[70vh] w-80 space-y-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Filtres</span>
              {activeFilterCount > 0 && (
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                  Réinitialiser
                </button>
              )}
            </div>

            {suppliers.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fournisseur</Label>
                <Select
                  value={filters.supplierId ?? "all"}
                  onValueChange={(v) => setFilters({ supplierId: v === "all" ? null : v })}
                >
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les fournisseurs</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {domains.length > 1 && (
              <fieldset className="space-y-1">
                <legend className="mb-1 text-xs font-medium">Domaines</legend>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {domains.map((d) => {
                    const checked = filters.domains.includes(d.id);
                    return (
                      <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setFilters({
                              domains: v ? [...filters.domains, d.id] : filters.domains.filter((x) => x !== d.id),
                            })
                          }
                        />
                        <span className="article-no">{d.code}</span>
                        <span className="truncate">{d.title}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset className="space-y-1">
              <legend className="mb-1 text-xs font-medium">Statut d'au moins une réponse</legend>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((s: ResponseStatus) => {
                  const on = filters.statuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setFilters({
                          statuses: on ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s],
                        })
                      }
                      className={cn("stamp", STATUS_META[s].className, !on && "opacity-50")}
                    >
                      {STATUS_META[s].label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="score-min">Note min.</Label>
                <Select value={filters.scoreMin === null ? "none" : String(filters.scoreMin)} onValueChange={(v) => setFilters({ scoreMin: v === "none" ? null : Number(v) })}>
                  <SelectTrigger id="score-min" className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {[0, 1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="score-max">Note max.</Label>
                <Select value={filters.scoreMax === null ? "none" : String(filters.scoreMax)} onValueChange={(v) => setFilters({ scoreMax: v === "none" ? null : Number(v) })}>
                  <SelectTrigger id="score-max" className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {[0, 1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={filters.hasQuestion} onCheckedChange={(v) => setFilters({ hasQuestion: !!v })} />
                Avec une question au fournisseur
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={filters.hasComment} onCheckedChange={(v) => setFilters({ hasComment: !!v })} />
                Avec un commentaire manuel
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={filters.hasOpenThread} onCheckedChange={(v) => setFilters({ hasOpenThread: !!v })} />
                Avec une discussion ouverte
              </label>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filters.supplierId && (
        <div className="flex items-center gap-2 border-b border-border bg-accent px-3 py-1 text-xs text-accent-foreground">
          <span className="truncate">
            Fournisseur : {suppliers.find((s) => s.id === filters.supplierId)?.name ?? "—"}
          </span>
          <button className="ml-auto" aria-label="Retirer le filtre fournisseur" onClick={() => setFilters({ supplierId: null })}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto px-1.5 pb-2" role="listbox" aria-label="Exigences">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground">
            {tab === "todo" && activeFilterCount === 0 && !filters.search
              ? "Rien à faire : toutes les exigences sont évaluées."
              : "Aucune exigence ne correspond."}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.id}>
              <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-rail px-3 pb-1 pt-2.5 text-xs">
                <span className="article-no">{g.code}</span>
                <span className="truncate font-medium">{g.title}</span>
                <span className="tnum ml-auto text-muted-foreground">{g.items.length}</span>
              </div>
              {g.items.map((it) => {
                const selected = it.id === selectedId;
                const review = reviewStatusOf?.(it.id) ?? null;
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-id={it.id}
                    onClick={() => onSelect(it.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md py-1.5 pl-2.5 pr-2.5 text-left transition-colors duration-150",
                      selected ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <span className="article-no mt-0.5 w-14 shrink-0 truncate">{it.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-[18px] text-foreground">{it.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
                        {it.isMandatory && <span className="font-semibold uppercase">Oblig.</span>}
                        {review && review !== "draft" && <span>{REVIEW_LABEL[review]}</span>}
                        {openThreadIds.has(it.id) && <MessageSquare className="h-3 w-3 text-primary" aria-label="Discussion ouverte" />}
                        {it.hasComment && <StickyNote className="h-3 w-3 text-primary" aria-label="Commentaire" />}
                        {it.hasQuestion && <HelpCircle className="h-3 w-3 text-primary" aria-label="Question posée" />}
                      </span>
                    </span>
                    <Progress item={it} />
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
