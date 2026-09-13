"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPaste, FileAudio, FileText, Loader2, Replace, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useGranolaMeetings, useSoutenanceMutations, type SessionDetail } from "@/hooks/use-soutenances";
import { formatAt, voiceLabel, type TranscriptSegment } from "@/lib/connectors/granola";
import { transcribeRecording, type AudioImportProgress } from "@/lib/soutenance/audio";
import { formatDateTime, formatDuration, formatUsd } from "@/lib/format";
import { formatSessionDate } from "@/lib/soutenance/dates";
import { cn } from "@/lib/utils";
import { StepPanel } from "./DocPanel";

function Turn({ s, names, highlighted }: { s: TranscriptSegment; names: Record<string, string>; highlighted?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[60px_110px_minmax(0,1fr)] gap-2.5 py-0.5 text-sm leading-[19px]", highlighted && "-mx-3 rounded-sm bg-accent px-3 text-accent-foreground")}>
      <span className="num pt-0.5 text-xs text-muted-foreground">{formatAt(s.t)}</span>
      <span className={cn("truncate pt-px text-xs font-medium", highlighted ? "text-accent-foreground" : "text-muted-foreground")}>{voiceLabel(s.voice, names)}</span>
      <span>{s.text}</span>
    </div>
  );
}

/** The whole transcript, in a side panel, opened at a time when asked. */
export function TranscriptSheet({ open, onOpenChange, segments, names, at, title }: { open: boolean; onOpenChange: (o: boolean) => void; segments: TranscriptSegment[]; names: Record<string, string>; at: string | null; title: string }) {
  const [filter, setFilter] = useState("");
  const targetRef = useRef<HTMLDivElement>(null);
  const targetIndex = useMemo(() => (at ? segments.findIndex((s) => formatAt(s.t) === at) : -1), [segments, at]);
  useEffect(() => {
    if (open && targetIndex >= 0) setTimeout(() => targetRef.current?.scrollIntoView({ block: "center" }), 50);
  }, [open, targetIndex]);
  const visible = filter.trim() ? segments.filter((s) => s.text.toLowerCase().includes(filter.toLowerCase())) : segments;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Chercher dans le transcript" className="h-full flex-1 bg-transparent text-sm outline-none" aria-label="Chercher dans le transcript" />
        </div>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {visible.map((s, i) => {
            const idx = segments.indexOf(s);
            return (
              <div key={`${s.t}-${i}`} ref={idx === targetIndex ? targetRef : undefined}>
                <Turn s={s} names={names} highlighted={idx === targetIndex} />
              </div>
            );
          })}
          {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun passage ne contient « {filter} ».</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The transcript of the séance: where it comes from, how long, which voices;
 * an excerpt; the whole in a side panel. Loaded from Granola (a meeting
 * chosen in a list) or pasted. Voices can be named, it is optional.
 */
export function TranscriptPanel({ rfpId, detail, canEdit, openAt, onOpenAtHandled }: { rfpId: string; detail: SessionDetail; canEdit: boolean; openAt: string | null; onOpenAtHandled: () => void }) {
  const { loadTranscript, deleteTranscript, patchSession } = useSoutenanceMutations(rfpId);
  const session = detail.session;
  const segments = (session?.transcript_segments ?? []) as TranscriptSegment[];
  const names = session?.voice_names ?? {};
  const meta = session?.transcript_meta ?? {};
  const has = segments.length > 0;
  const [sheet, setSheet] = useState(false);
  const [granola, setGranola] = useState(false);
  const [paste, setPaste] = useState(false);
  const [audio, setAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState<AudioImportProgress | null>(null);
  const audioAbort = useRef<AbortController | null>(null);
  const [naming, setNaming] = useState(false);
  const [pasted, setPasted] = useState("");
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const canFetch = detail.overview.granola.canFetch;
  const around = session?.scheduled_at ?? null;
  const meetings = useGranolaMeetings(rfpId, around, granola);

  useEffect(() => {
    if (openAt) {
      setSheet(true);
      onOpenAtHandled();
    }
  }, [openAt, onOpenAtHandled]);

  const fetchGranola = async () => {
    if (!chosen) return;
    try {
      await loadTranscript.mutateAsync({ supplierId: detail.supplier.id, source: "granola", note_id: chosen });
      setGranola(false);
      setChosen(null);
      toast.success("Transcript récupéré depuis Granola.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le transcript n'a pas pu être récupéré.");
    }
  };
  const submitPaste = async () => {
    try {
      await loadTranscript.mutateAsync({ supplierId: detail.supplier.id, source: "pasted", text: pasted });
      setPaste(false);
      setPasted("");
      toast.success("Transcript chargé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le transcript n'a pas pu être chargé.");
    }
  };
  const submitAudio = async () => {
    if (!audioFile) return;
    const controller = new AbortController();
    audioAbort.current = controller;
    try {
      const result = await transcribeRecording(rfpId, detail.supplier.id, audioFile, setAudioProgress, controller.signal);
      await loadTranscript.mutateAsync({ supplierId: detail.supplier.id, source: "audio", text: result.text, title: audioFile.name, cost: result.cost });
      setAudio(false);
      setAudioFile(null);
      toast.success(`Enregistrement transcrit${result.cost > 0 ? ` · ${formatUsd(result.cost)}` : ""}.`);
    } catch (err) {
      if (!controller.signal.aborted) toast.error(err instanceof Error ? err.message : "L'enregistrement n'a pas pu être transcrit.");
    } finally {
      audioAbort.current = null;
      setAudioProgress(null);
    }
  };
  const cancelAudio = () => {
    audioAbort.current?.abort();
    setAudio(false);
    setAudioFile(null);
    setAudioProgress(null);
  };

  const saveNames = async () => {
    try {
      await patchSession.mutateAsync({ supplierId: detail.supplier.id, voice_names: Object.fromEntries(Object.entries(nameDraft).filter(([, v]) => v.trim())) });
      setNaming(false);
      toast.success("Voix nommées.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Non enregistré.");
    }
  };
  const remove = async () => {
    try {
      await deleteTranscript.mutateAsync({ supplierId: detail.supplier.id });
      toast.success("Transcript retiré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le transcript n'a pas pu être retiré.");
    }
  };

  const voices = meta.voices ?? [];
  const sourceLabel = session?.transcript_source === "granola" ? "Granola" : session?.transcript_source === "audio" ? "Enregistrement audio" : "Texte collé";
  const state = has
    ? `${sourceLabel}${meta.title ? ` · « ${meta.title} »` : ""}${meta.imported_at ? ` · récupéré le ${formatDateTime(meta.imported_at)}` : ""}${voices.length ? ` · ${voices.length} voix distinguée${voices.length > 1 ? "s" : ""}` : ""}${meta.words ? ` · ${meta.words.toLocaleString("fr-FR")} mots` : ""}${meta.duration_seconds ? ` · ${formatDuration(meta.duration_seconds)}` : ""}`
    : "Ce qui a été dit en séance, depuis Granola ou un texte collé. Il nourrit le compte rendu et les propositions.";
  const visibleMeetings = (meetings.data?.meetings ?? []).filter((m) => !filter.trim() || m.title.toLowerCase().includes(filter.toLowerCase()) || m.attendees.join(" ").toLowerCase().includes(filter.toLowerCase()));

  return (
    <StepPanel
      id="transcript"
      title="Transcript"
      dot={has ? "done" : "todo"}
      state={state}
      actions={
        has ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSheet(true)}>
              <FileText className="h-4 w-4" />
              Lire en entier
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNameDraft(Object.fromEntries(voices.map((v) => [v, names[v] ?? ""])));
                  setNaming(true);
                }}
              >
                <Users className="h-4 w-4" />
                Nommer les voix
              </Button>
            )}
            {(canEdit || canFetch) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={loadTranscript.isPending}>
                    {loadTranscript.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
                    Remplacer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canFetch && <DropdownMenuItem onSelect={() => setGranola(true)}>Récupérer depuis Granola</DropdownMenuItem>}
                  {canEdit && <DropdownMenuItem onSelect={() => setPaste(true)}>Coller un texte</DropdownMenuItem>}
                  {canEdit && <DropdownMenuItem onSelect={() => setAudio(true)}>Importer un enregistrement audio</DropdownMenuItem>}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={remove} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Retirer le transcript
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        ) : (
          <>
            {canFetch && (
              <Button type="button" variant="outline" size="sm" onClick={() => setGranola(true)} disabled={loadTranscript.isPending}>
                {loadTranscript.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Récupérer depuis Granola
              </Button>
            )}
            {canEdit && (
              <Button type="button" variant={canFetch ? "ghost" : "outline"} size="sm" onClick={() => setPaste(true)}>
                <ClipboardPaste className="h-4 w-4" />
                Coller un texte
              </Button>
            )}
            {canEdit && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAudio(true)}>
                <FileAudio className="h-4 w-4" />
                Importer un audio
              </Button>
            )}
          </>
        )
      }
    >
      {has ? (
        <>
          <div className="rounded-md border border-border bg-background px-3 py-2">
            {segments.slice(0, 4).map((s, i) => (
              <Turn key={i} s={s} names={names} />
            ))}
            {segments.length > 4 && (
              <button type="button" onClick={() => setSheet(true)} className="mt-1 text-xs text-accent-foreground hover:underline underline-offset-4">
                … {segments.length - 4} autres prises de parole
              </button>
            )}
          </div>
          <p className="max-w-[70ch] text-xs text-muted-foreground">
            Granola distingue les voix (Moi, Intervenant, A, B…) sans les nommer. Les nommer est facultatif : l&apos;agent identifie le fournisseur au contexte et les extraits de preuve gardent l&apos;horodatage.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {canFetch
            ? "Choisissez la réunion dans Granola, collez le texte d'un autre outil de transcription, ou importez l'enregistrement audio."
            : detail.overview.granola.available
              ? "La récupération depuis Granola est réservée aux pilotes ; collez le texte ou importez l'enregistrement, ou demandez au pilote."
              : "Aucune clé Granola pour cette organisation : collez le texte d'un autre outil, importez l'enregistrement, ou ajoutez une clé dans Agents & IA › Connecteurs."}
        </p>
      )}

      <TranscriptSheet open={sheet} onOpenChange={setSheet} segments={segments} names={names} at={openAt} title={`Transcript · ${detail.supplier.name}`} />

      <Dialog open={granola} onOpenChange={setGranola}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Récupérer le transcript depuis Granola</DialogTitle>
            <DialogDescription>
              Réunions {around ? `autour du ${formatSessionDate(around)}` : "des dix derniers jours"}
              {meetings.data?.scope === "user" ? ", avec votre clé personnelle" : meetings.data?.scope === "organization" ? ", avec la clé de l'organisation" : ""}. Le transcript complet n&apos;est chargé qu&apos;une fois la réunion choisie.
            </DialogDescription>
          </DialogHeader>
          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher une réunion" className="h-full flex-1 bg-transparent text-sm outline-none" aria-label="Rechercher une réunion" />
          </div>
          <div className="max-h-[320px] overflow-y-auto rounded-md border border-border bg-card" role="radiogroup" aria-label="Réunions">
            {meetings.isLoading ? (
              <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Lecture des réunions
              </p>
            ) : meetings.error ? (
              <p className="px-3 py-6 text-sm text-status-fail">{meetings.error.message}</p>
            ) : visibleMeetings.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">Aucune réunion trouvée sur cette période.</p>
            ) : (
              visibleMeetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen === m.id}
                  onClick={() => setChosen(m.id)}
                  className={cn("grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border px-3 py-2 text-left last:border-0", chosen === m.id ? "bg-accent" : "hover:bg-accent/50")}
                >
                  <span className={cn("h-3.5 w-3.5 rounded-full border-[1.5px] border-input", chosen === m.id && "border-4 border-primary")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{m.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(m.created_at)}
                      {m.attendees.length > 0 ? ` · ${m.attendees.slice(0, 3).join(", ")}${m.attendees.length > 3 ? `, +${m.attendees.length - 3}` : ""}` : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGranola(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={!chosen || loadTranscript.isPending} onClick={fetchGranola}>
              {loadTranscript.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Récupérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paste} onOpenChange={setPaste}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coller le transcript</DialogTitle>
            <DialogDescription>Le texte brut de votre outil de transcription. Les lignes « [00:12:34] Nom : texte » ou « Nom : texte » sont reconnues ; sinon chaque paragraphe devient une prise de parole.</DialogDescription>
          </DialogHeader>
          <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} className="min-h-[280px] font-mono text-xs" placeholder="Collez ici le transcript de la séance" aria-label="Transcript" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPaste(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={pasted.trim().length < 20 || loadTranscript.isPending} onClick={submitPaste}>
              Charger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={audio} onOpenChange={(o) => (o ? setAudio(true) : cancelAudio())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer un enregistrement audio</DialogTitle>
            <DialogDescription>
              L&apos;enregistrement est découpé en morceaux de deux minutes et transcrit mot pour mot par le modèle de dictée de l&apos;organisation, environ {formatUsd(0.1)} par heure. Comptez une à deux minutes par dizaine de minutes d&apos;audio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="audio-file">Fichier audio (mp3, m4a, wav, webm, ogg)</Label>
            <Input id="audio-file" type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg" disabled={!!audioProgress} onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="h-9" />
            {audioProgress && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Morceau {audioProgress.piece} sur {audioProgress.pieces} · {formatDuration(Math.round(audioProgress.seconds))} d&apos;enregistrement
                </p>
                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(((audioProgress.piece - 1) / audioProgress.pieces) * 100)}%` }} />
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelAudio}>
              {audioProgress ? "Interrompre" : "Annuler"}
            </Button>
            <Button type="button" disabled={!audioFile || !!audioProgress} onClick={submitAudio}>
              {audioProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Transcrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={naming} onOpenChange={setNaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nommer les voix</DialogTitle>
            <DialogDescription>Facultatif. Un nom rend le transcript et les extraits plus lisibles ; il ne change pas l&apos;analyse.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {voices.map((v) => {
              const sample = segments.find((s) => s.voice === v);
              return (
                <div key={v} className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-3">
                  <Label htmlFor={`voice-${v}`} className="pt-2">
                    {voiceLabel(v, {})}
                  </Label>
                  <div className="space-y-1">
                    <Input id={`voice-${v}`} value={nameDraft[v] ?? ""} onChange={(e) => setNameDraft({ ...nameDraft, [v]: e.target.value })} placeholder="Nom ou rôle (Witco, J. Morel, Client…)" className="h-9" />
                    {sample && <p className="truncate text-xs text-muted-foreground">« {sample.text.slice(0, 90)}{sample.text.length > 90 ? "…" : ""} »</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNaming(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={patchSession.isPending} onClick={saveNames}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepPanel>
  );
}
