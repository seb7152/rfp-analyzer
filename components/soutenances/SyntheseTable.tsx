"use client";

import { ScrollX } from "@/components/shell/ScrollX";
import { scaleClass } from "@/lib/scoring";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Overview } from "@/hooks/use-soutenances";

/**
 * The quick read of the point de synthèse: one note per domain and per
 * supplier on the 0 → 5 scale, the retained suppliers' mean, a weighted
 * total. A cell selects its supplier for the reading below.
 */
export function SyntheseTable({
  overview,
  selectedId,
  onSelect,
  large,
}: {
  overview: Overview;
  selectedId: string | null;
  onSelect: (supplierId: string) => void;
  large?: boolean;
}) {
  const retained = overview.suppliers.filter((s) => !s.removed);
  const removed = overview.suppliers.filter((s) => s.removed);
  const columns = [...retained, ...removed];
  const overallOf = (id: string) => overview.scores.overall.find((o) => o.supplierId === id);
  const cell = (score: number | null, supplierId: string, label: string, dimmed: boolean) => (
    <button
      type="button"
      onClick={() => onSelect(supplierId)}
      aria-label={label}
      aria-pressed={selectedId === supplierId}
      className={cn(
        "tnum flex h-9 w-full min-w-[56px] items-center justify-center rounded-sm font-semibold transition-[outline] duration-150 hover:outline hover:outline-2 hover:outline-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        large && "h-12 text-lg",
        scaleClass(score),
        dimmed && "opacity-45"
      )}
    >
      {formatScore(score)}
    </button>
  );
  return (
    <ScrollX hint={`Faites défiler vers la droite : ${columns.length} fournisseurs.`}>
      <table aria-label="Notes par domaine" className={cn("w-full min-w-[560px] border-collapse text-sm", large && "text-lg")}>
        <thead>
          <tr>
            <th className={cn("sticky left-0 z-10 bg-card py-2 pr-3 text-left text-xs font-medium text-muted-foreground", large && "text-sm")}>Domaine</th>
            {columns.map((s) => (
              <th
                key={s.id}
                className={cn("min-w-[72px] px-1 py-2 text-center text-xs font-medium text-muted-foreground", large && "text-sm", s.removed && "opacity-60", selectedId === s.id && "rounded-t-sm bg-accent/40 font-semibold text-foreground")}
              >
                <span className="line-clamp-2">{s.name}</span>
              </th>
            ))}
            <th className={cn("min-w-[72px] border-l border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground", large && "text-sm")}>
              Moyenne
              <span className="block font-normal">des {retained.length} retenus</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {overview.scores.rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="sticky left-0 z-10 min-w-[150px] max-w-[320px] bg-card py-1.5 pr-3 md:min-w-[200px]">
                <span className="article-no block whitespace-nowrap md:mr-2 md:inline">{row.code}</span>
                <span className="line-clamp-2">{row.title}</span>
                <span className="tnum block text-xs text-muted-foreground md:ml-2 md:inline">{row.requirementCount} exig.</span>
              </td>
              {columns.map((s) => {
                const c = row.cells[s.id];
                return (
                  <td key={s.id} className={cn("p-0.5", selectedId === s.id && "bg-accent/40")}>
                    {cell(c?.score ?? null, s.id, `${row.title}, ${s.name} : ${formatScore(c?.score ?? null)} sur 5`, !!s.removed)}
                  </td>
                );
              })}
              <td className="tnum border-l border-border px-2 text-center font-semibold">{formatScore(row.mean)}</td>
            </tr>
          ))}
          <tr className="border-t border-input">
            <td className="sticky left-0 z-10 bg-card py-1.5 pr-3 font-semibold">
              Ensemble, pondéré
              <span className="tnum block text-xs font-normal text-muted-foreground md:ml-2 md:inline">{overview.scores.overall[0]?.total ?? 0} exig.</span>
            </td>
            {columns.map((s) => {
              const o = overallOf(s.id);
              return (
                <td key={s.id} className={cn("p-0.5", selectedId === s.id && "rounded-b-sm bg-accent/40")}>
                  {cell(o?.score ?? null, s.id, `Ensemble, ${s.name} : ${formatScore(o?.score ?? null)} sur 5`, !!s.removed)}
                </td>
              );
            })}
            <td className="tnum border-l border-border px-2 text-center font-semibold">{formatScore(overview.scores.overallMean)}</td>
          </tr>
        </tbody>
      </table>
    </ScrollX>
  );
}
