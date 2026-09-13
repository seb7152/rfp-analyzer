"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSoutenanceMutations, type Overview } from "@/hooks/use-soutenances";
import { SESSION_STATE_LABEL, type SessionState } from "@/lib/soutenance/types";
import { formatSessionDate, fromDateAndTime, toDateAndTime } from "@/lib/soutenance/dates";
import { formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATE_STAMP: Record<SessionState, string> = {
  a_preparer: "stamp-pending",
  preparee: "stamp-roadmap",
  tenue: "stamp-partial",
  exploitee: "stamp-pass",
};

export function SessionStamp({ state, className }: { state: SessionState; className?: string }) {
  return <span className={cn("stamp", STATE_STAMP[state], className)}>{SESSION_STATE_LABEL[state]}</span>;
}

type Planned = { date: string; time: string };

const epoch = (iso: string | null) => (iso ? new Date(iso).getTime() : null);

/**
 * One line per supplier retained in the version: the date, the brief, the
 * transcript, the proposals, the state. The line leads to the séance. The
 * band above says which version receives the reprises.
 */
export function SessionsPanel({ rfpId, overview, canEdit }: { rfpId: string; overview: Overview; canEdit: boolean }) {
  const router = useRouter();
  const { setTargetVersion, patchSession } = useSoutenanceMutations(rfpId);
  const retained = overview.sessions.filter((s) => !s.supplier.removed);
  const removed = overview.sessions.filter((s) => s.supplier.removed);
  const held = retained.filter((s) => s.state === "tenue" || s.state === "exploitee").length;
  const exploited = retained.filter((s) => s.state === "exploitee").length;
  const [planning, setPlanning] = useState(false);
  const [dates, setDates] = useState<Record<string, Planned>>({});
  const target = overview.targetVersion;
  const active = overview.versions.find((v) => v.is_active);

  const openPlanning = () => {
    setDates(Object.fromEntries(retained.map((s) => [s.supplier.id, toDateAndTime(s.session?.scheduled_at ?? null)])));
    setPlanning(true);
  };
  const setPlanned = (supplierId: string, patch: Partial<Planned>) => setDates((prev) => ({ ...prev, [supplierId]: { ...(prev[supplierId] ?? { date: "", time: "" }), ...patch } }));

  const savePlanning = async () => {
    // A time without a date is nothing; a date without a time is the day (kept at local midnight).
    const changes = retained
      .map((s) => ({ s, value: fromDateAndTime(dates[s.supplier.id]?.date ?? "", dates[s.supplier.id]?.time ?? "") }))
      .filter(({ s, value }) => epoch(value) !== epoch(s.session?.scheduled_at ?? null));
    try {
      for (const { s, value } of changes) {
        await patchSession.mutateAsync({ supplierId: s.supplier.id, scheduled_at: value });
      }
      setPlanning(false);
      toast.success(changes.length === 0 ? "Aucune date modifiée." : `${changes.length} séance${changes.length > 1 ? "s" : ""} planifiée${changes.length > 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Les dates n'ont pas été enregistrées.");
    }
  };

  const changeTarget = async (value: string) => {
    try {
      await setTargetVersion.mutateAsync(value === "active" ? null : value);
      toast.success("Version cible enregistrée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La version cible n'a pas été enregistrée.");
    }
  };

  return (
    <section id="seances" className="panel mx-4 scroll-mt-4 md:mx-8" aria-labelledby="seances-title">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", exploited === retained.length && retained.length > 0 ? "bg-status-pass" : held > 0 ? "bg-status-partial" : "border-[1.5px] border-input")} aria-hidden />
        <h2 id="seances-title" className="text-base font-semibold">
          Séances
        </h2>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {retained.length === 0 ? "Aucun fournisseur retenu dans cette version." : `${held} tenue${held > 1 ? "s" : ""} sur ${retained.length} · ${exploited} exploitée${exploited > 1 ? "s" : ""}`}
        </span>
        {canEdit && retained.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={openPlanning}>
            <Calendar className="h-4 w-4" />
            Planifier
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent px-4 py-2 text-sm text-accent-foreground md:px-5">
        <Layers className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          Les propositions reprises s&apos;appliquent à <strong className="font-semibold">{target ? `V${target.version_number} · ${target.version_name}` : "la version active"}</strong>
          {target && !target.chosen ? " (version active)" : ""}.
          {target && active && target.id === active.id && overview.versions.length === 1 ? " Pour garder l'évaluation initiale intacte, créez d'abord une version « Après soutenances » par copie." : ""}
        </span>
        {canEdit ? (
          <Select value={target?.chosen ? target.id : "active"} onValueChange={changeTarget} disabled={setTargetVersion.isPending}>
            <SelectTrigger className="h-7 w-56 bg-card text-xs" aria-label="Version cible des reprises">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Toujours la version active</SelectItem>
              {overview.versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  V{v.version_number} · {v.version_name}
                  {v.is_active ? " (active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {canEdit && (
          <Link href={`/dashboard/rfp/${rfpId}/parametres#versions`} className="text-xs underline underline-offset-4">
            Gérer les versions
          </Link>
        )}
      </div>

      {retained.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground md:px-5">Les fournisseurs se déclarent dans la Préparation et se retiennent dans Paramètres › Fournisseurs.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 md:px-5">Fournisseur</th>
                <th className="py-2 pr-3">Séance</th>
                <th className="py-2 pr-3">Brief</th>
                <th className="py-2 pr-3">Transcript</th>
                <th className="py-2 pr-3">Compte rendu et propositions</th>
                <th className="py-2 pr-3">État</th>
                <th className="w-8 py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {retained.map((s) => {
                const meta = s.session?.transcript_meta ?? {};
                const proposals = s.analysis.proposed + s.analysis.accepted + s.analysis.rejected;
                return (
                  <tr
                    key={s.supplier.id}
                    className="group cursor-pointer border-t border-border hover:bg-accent/40"
                    onClick={(e) => {
                      // The whole line opens the séance; the name stays a real link for the keyboard and the middle click.
                      if ((e.target as HTMLElement).closest("a")) return;
                      router.push(`/dashboard/rfp/${rfpId}/soutenances/${s.supplier.id}`);
                    }}
                  >
                    <td className="relative px-4 py-2.5 md:px-5">
                      <Link href={`/dashboard/rfp/${rfpId}/soutenances/${s.supplier.id}`} className="font-semibold group-hover:underline group-hover:underline-offset-4">
                        {s.supplier.name}
                      </Link>
                    </td>
                    <td className="tnum py-2.5 pr-3">{s.session?.scheduled_at ? formatSessionDate(s.session.scheduled_at) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2.5 pr-3">
                      {s.brief?.status === "completed" ? (
                        <>
                          Prêt
                          <span className="block text-xs text-muted-foreground">généré le {formatDateTime(s.brief.completed_at ?? s.brief.created_at)}</span>
                        </>
                      ) : s.brief?.status === "pending" || s.brief?.status === "processing" ? (
                        <span className="inline-flex items-center gap-1.5 text-accent-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          En cours
                        </span>
                      ) : s.brief?.status === "failed" ? (
                        <span className="text-status-fail">Échec</span>
                      ) : (
                        <span className="text-muted-foreground">À générer</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.session?.transcript_source ? (
                        <>
                          {s.session.transcript_source === "granola" ? "Granola" : s.session.transcript_source === "audio" ? "Audio" : "Collé"}
                          {meta.duration_seconds ? ` · ${formatDuration(meta.duration_seconds)}` : ""}
                          <span className="block text-xs text-muted-foreground">
                            {meta.voices?.length ? `${meta.voices.length} voix` : ""}
                            {meta.words ? `${meta.voices?.length ? " · " : ""}${meta.words.toLocaleString("fr-FR")} mots` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.reportJob?.status === "pending" || s.reportJob?.status === "running" || s.analysis.status === "pending" || s.analysis.status === "running" ? (
                        <span className="inline-flex items-center gap-1.5 text-accent-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {s.reportJob?.status === "running" || s.reportJob?.status === "pending" ? "Compte rendu en cours" : "Propositions en cours"}
                        </span>
                      ) : s.reportJob?.status === "failed" ? (
                        <span className="text-status-fail">Échec de l&apos;analyse</span>
                      ) : proposals > 0 ? (
                        <>
                          <span className="num">{proposals}</span> · <span className="num">{s.analysis.accepted}</span> reprise{s.analysis.accepted > 1 ? "s" : ""} · <span className="num">{s.analysis.rejected}</span> écartée{s.analysis.rejected > 1 ? "s" : ""}
                          {s.analysis.proposed > 0 && <span className="block text-xs text-muted-foreground">{s.analysis.proposed} à décider</span>}
                        </>
                      ) : s.session?.report_markdown ? (
                        <span className="text-muted-foreground">Compte rendu sans proposition</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <SessionStamp state={s.state} />
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground group-hover:text-foreground">
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </td>
                  </tr>
                );
              })}
              {removed.map((s) => (
                <tr key={s.supplier.id} className="border-t border-border bg-rail text-muted-foreground">
                  <td className="px-4 py-2.5 font-medium md:px-5">{s.supplier.name}</td>
                  <td colSpan={4} className="py-2.5 pr-3 text-xs">
                    Non retenu{s.supplier.removed?.reason ? ` · « ${s.supplier.removed.reason} »` : ""}
                    {s.supplier.removed?.removed_at ? ` · retiré le ${formatDateTime(s.supplier.removed.removed_at)}` : ""}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="stamp stamp-pending">Retiré</span>
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={planning} onOpenChange={setPlanning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier les séances</DialogTitle>
            <DialogDescription>La date sert à retrouver la réunion dans Granola et à dater le compte rendu. L&apos;heure est facultative ; une date vide retire la séance du calendrier.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_150px_96px] items-center gap-3 text-xs font-medium text-muted-foreground">
              <span>Fournisseur</span>
              <span>Date</span>
              <span>Heure</span>
            </div>
            {retained.map((s) => (
              <div key={s.supplier.id} className="grid grid-cols-[minmax(0,1fr)_150px_96px] items-center gap-3">
                <Label htmlFor={`date-${s.supplier.id}`} className="truncate">
                  {s.supplier.name}
                </Label>
                <Input id={`date-${s.supplier.id}`} type="date" value={dates[s.supplier.id]?.date ?? ""} onChange={(e) => setPlanned(s.supplier.id, { date: e.target.value })} className="h-9" />
                <Input
                  id={`time-${s.supplier.id}`}
                  type="time"
                  aria-label={`Heure, ${s.supplier.name}`}
                  value={dates[s.supplier.id]?.time ?? ""}
                  disabled={!dates[s.supplier.id]?.date}
                  onChange={(e) => setPlanned(s.supplier.id, { time: e.target.value })}
                  className="h-9"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanning(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={patchSession.isPending} onClick={savePlanning}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
