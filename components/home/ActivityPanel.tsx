"use client";

import Link from "next/link";
import { Avatar } from "@/components/shell/UserMenu";
import type { ConsultationOverview } from "@/hooks/use-consultations-overview";
import { formatDateTime } from "@/lib/format";

/** Recent evaluations across consultations, from the responses' audit fields. */
export function ActivityPanel({ items }: { items: ConsultationOverview[] }) {
  const entries = items
    .flatMap((i) => (i.preparation?.recentActivity ?? []).map((a) => ({ ...a, rfp: i.rfp })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  return (
    <section className="panel overflow-hidden" aria-labelledby="activity-title">
      <h2 id="activity-title" className="border-b border-border px-4 py-2.5 text-sm font-semibold">
        Activité récente
      </h2>
      {entries.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Aucune évaluation enregistrée.</p>
      ) : (
        <ul>
          {entries.map((e, i) => (
            <li key={`${e.rfp.id}-${e.userId}-${e.at}`} className="flex gap-2.5 border-b border-border px-4 py-2.5 text-xs last:border-b-0">
              <Avatar name={e.userName} tone={i} size={22} className="mt-0.5" />
              <span className="min-w-0 flex-1 text-muted-foreground">
                <span className="font-semibold text-foreground">{e.userName}</span> a évalué{" "}
                <span className="num text-foreground">{e.evaluated}</span> {e.evaluated > 1 ? "réponses" : "réponse"} ·{" "}
                <Link href={`/dashboard/rfp/${e.rfp.id}`} className="text-foreground hover:underline underline-offset-2">
                  {e.rfp.title}
                </Link>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
