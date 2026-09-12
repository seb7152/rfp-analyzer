"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scaleClass } from "@/lib/scoring";
import { formatDate, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Overview } from "@/hooks/use-soutenances";
import { SyntheseTable } from "./SyntheseTable";
import { Delta } from "./SupplierReading";

/**
 * The point de synthèse for the meeting room: one idea per screen, large
 * type. The overview first, then one screen per retained supplier, then
 * the suppliers removed from the version and why. ← → to move, Escape to
 * leave; full screen when the browser allows it.
 */
export function SynthesePresenter({ overview, onClose }: { overview: Overview; onClose: () => void }) {
  const retained = overview.suppliers.filter((s) => !s.removed);
  const removed = overview.suppliers.filter((s) => s.removed);
  const slides = ["overview", ...retained.map((s) => s.id), ...(removed.length > 0 ? ["removed"] : [])];
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const go = useCallback((d: number) => setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + d))), [slides.length]);

  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Escape") onClose();
    };
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [go, onClose]);

  const slide = slides[index];
  const supplier = retained.find((s) => s.id === slide) ?? null;
  const overall = supplier ? overview.scores.overall.find((o) => o.supplierId === supplier.id) : null;
  const synth = supplier ? overview.synthese?.data?.suppliers?.[supplier.id] : null;
  const top = (kind: "forces" | "faiblesses" | "questions") =>
    overview.scores.rows.flatMap((row) => (synth?.domains?.[row.id]?.[kind] ?? []).map((i) => ({ ...i, domain: row.code }))).slice(0, 5);

  return (
    <div ref={ref} className="fixed inset-0 z-50 flex flex-col bg-card px-10 py-8 text-foreground md:px-16 md:py-10" role="dialog" aria-label="Point de synthèse, mode présentation">
      <div className="flex-1 overflow-y-auto">
        {slide === "overview" && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em]">Point de synthèse</h1>
              <p className="mt-1 text-base text-muted-foreground">
                {overview.rfp.title} · {overview.version?.version_name ?? ""}
                {overview.synthese?.generated_at ? ` · synthèse du ${formatDate(overview.synthese.generated_at)}` : ""}
              </p>
            </header>
            <SyntheseTable overview={overview} selectedId={null} onSelect={() => undefined} large />
            <p className="text-base text-muted-foreground">
              {retained.length} fournisseur{retained.length > 1 ? "s" : ""} retenu{retained.length > 1 ? "s" : ""} pour les soutenances
              {removed.length > 0 ? ` · ${removed.length} retiré${removed.length > 1 ? "s" : ""}` : ""}.
            </p>
          </div>
        )}

        {supplier && (
          <div className="flex h-full flex-col gap-7">
            <header className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em]">{supplier.name}</h1>
                <p className="mt-1 text-base text-muted-foreground">
                  {overview.rfp.title} · {overview.version?.version_name ?? ""}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="num text-4xl font-semibold leading-10">
                  {formatScore(overall?.score ?? null)}
                  <span className="text-base font-normal text-muted-foreground"> /5</span>
                </span>
                <span className="text-sm leading-5 text-muted-foreground">
                  moyenne des {retained.length} retenus <span className="num font-semibold text-foreground">{formatScore(overview.scores.overallMean)}</span>{" "}
                  <Delta value={overall?.score ?? null} mean={overview.scores.overallMean} className="text-sm" />
                  <br />
                  {overall?.rank ? `${overall.rank}${overall.rank === 1 ? "er" : "e"} sur ${retained.length} · ` : ""}
                  {overall?.scored ?? 0} exigences évaluées
                </span>
              </div>
            </header>
            <div className="grid gap-4 md:grid-cols-3">
              {overview.scores.rows.map((row) => {
                const c = row.cells[supplier.id];
                return (
                  <div key={row.id} className="flex items-center gap-3.5 rounded-lg border border-border px-4 py-3.5">
                    <span className={cn("tnum flex h-11 w-14 shrink-0 items-center justify-center rounded-sm text-lg font-semibold", scaleClass(c?.score ?? null))}>{formatScore(c?.score ?? null)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold leading-5">
                        {row.code} · {row.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        moyenne {formatScore(row.mean)} <Delta value={c?.score ?? null} mean={row.mean} className="text-sm" /> · {row.requirementCount} exigences
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid flex-1 gap-8 md:grid-cols-3">
              {(
                [
                  ["forces", "Forces"],
                  ["faiblesses", "Points de vigilance"],
                  ["questions", "Questions à poser"],
                ] as const
              ).map(([kind, title]) => {
                const items = top(kind);
                return (
                  <div key={kind}>
                    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-muted-foreground">
                      {title} <span className="num font-medium">{items.length}</span>
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-base text-muted-foreground">{synth ? "Aucun point relevé." : "Synthèse non générée."}</p>
                    ) : (
                      <ul className="space-y-3">
                        {items.map((i, idx) => (
                          <li key={idx} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2.5 text-base leading-6">
                            <span className="article-no pt-1 text-[13px]">{i.code || i.domain}</span>
                            <span>{i.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {slide === "removed" && (
          <div className="flex flex-col gap-6">
            <header>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em]">Fournisseurs retirés de la version</h1>
              <p className="mt-1 text-base text-muted-foreground">Ils ne sont pas reçus en soutenance ; leurs réponses restent consultables.</p>
            </header>
            <ul className="space-y-4">
              {removed.map((s) => {
                const o = overview.scores.overall.find((x) => x.supplierId === s.id);
                return (
                  <li key={s.id} className="flex items-baseline gap-4 text-lg">
                    <span className="font-semibold">{s.name}</span>
                    <span className="num text-muted-foreground">{formatScore(o?.score ?? null)}/5</span>
                    <span className="text-muted-foreground">{s.removed?.reason ? `« ${s.removed.reason} »` : "Sans motif"}</span>
                    {s.removed?.removed_at ? <span className="text-sm text-muted-foreground">le {formatDate(s.removed.removed_at)}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <footer className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="truncate">
          {slides.map((s, i) => {
            const label = s === "overview" ? "Vue d'ensemble" : s === "removed" ? "Fournisseurs retirés" : retained.find((r) => r.id === s)?.name ?? "";
            return (
              <span key={s} className={cn(i === index && "font-semibold text-foreground")}>
                {i > 0 ? " · " : ""}
                {label}
              </span>
            );
          })}
        </span>
        <span className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="xs" mode="icon" aria-label="Écran précédent" onClick={() => go(-1)} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="num">
            {index + 1} / {slides.length}
          </span>
          <Button type="button" variant="ghost" size="xs" mode="icon" aria-label="Écran suivant" onClick={() => go(1)} disabled={index === slides.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={onClose} className="ml-3">
            <X className="h-3.5 w-3.5" />
            Quitter
          </Button>
        </span>
      </footer>
    </div>
  );
}
