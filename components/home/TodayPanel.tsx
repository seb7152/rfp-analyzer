"use client";

import Link from "next/link";
import { ChevronRight, FileText, ListChecks, Sparkles } from "lucide-react";
import type { ConsultationOverview } from "@/hooks/use-consultations-overview";
import { cn } from "@/lib/utils";

function Row({ icon: Icon, children, href, trailing }: { icon: typeof ListChecks; children: React.ReactNode; href: string; trailing?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm transition-colors duration-150 last:border-b-0 hover:bg-accent/40"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{children}</span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </Link>
  );
}

/**
 * What needs the pilot today, across their consultations in progress:
 * responses left to evaluate, analyses running, deposits missing.
 */
export function TodayPanel({ items }: { items: ConsultationOverview[] }) {
  const active = items.filter((i) => i.preparation && i.rfp.status === "in_progress");
  const toEvaluate = active.filter((i) => i.toEvaluate > 0 && i.phase >= 2);
  const processing = active.filter((i) => i.aiProcessing);
  const missing = active.filter((i) => i.missingDeposits.length > 0 && i.phase === 0);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const rows = [
    ...toEvaluate.map((i) => (
      <Row key={`e-${i.rfp.id}`} icon={ListChecks} href={`/dashboard/rfp/${i.rfp.id}/evaluate`}>
        <b className="num font-semibold">{i.toEvaluate}</b> réponses restent à évaluer sur <b className="font-semibold">{i.rfp.title}</b>
      </Row>
    )),
    ...processing.map((i) => {
      const pct = i.aiTotal > 0 ? Math.round((i.aiScored / i.aiTotal) * 100) : 0;
      return (
        <Row
          key={`p-${i.rfp.id}`}
          icon={Sparkles}
          href={`/dashboard/rfp/${i.rfp.id}/analyse`}
          trailing={
            <span aria-hidden className="inline-block h-1.5 w-[140px] overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
          }
        >
          Analyse IA en cours sur <b className="font-semibold">{i.rfp.title}</b> · <span className="num">{i.aiScored}/{i.aiTotal}</span> réponses notées
        </Row>
      );
    }),
    ...missing.map((i) => (
      <Row key={`m-${i.rfp.id}`} icon={FileText} href={`/dashboard/rfp/${i.rfp.id}/preparation#reponses`}>
        <b className="font-semibold">{i.rfp.title}</b> : réponses manquantes pour {i.missingDeposits.slice(0, 2).join(", ")}
        {i.missingDeposits.length > 2 ? ` et ${i.missingDeposits.length - 2} autres` : ""}
      </Row>
    )),
  ];

  return (
    <section className="panel overflow-hidden" aria-labelledby="today-title">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 id="today-title" className="text-sm font-semibold">Aujourd'hui</h2>
        <span className={cn("text-xs text-muted-foreground")}>{today}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          {active.length === 0 ? "Aucune consultation en cours." : "Rien en attente : les évaluations et les analyses sont à jour."}
        </p>
      ) : (
        rows
      )}
    </section>
  );
}
