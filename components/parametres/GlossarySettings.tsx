"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/shell/PageState";
import { glossaryBusy, useGlossary, useGlossaryMutations } from "@/hooks/use-glossary";
import { formatDateTime, formatUsd } from "@/lib/format";
import type { GlossaryTerm } from "@/lib/soutenance/types";
import { cn } from "@/lib/utils";

interface Draft {
  key: number;
  term: string;
  aliases: string;
  note: string;
  source: GlossaryTerm["source"];
}

let nextKey = 1;

function toDrafts(terms: GlossaryTerm[]): Draft[] {
  return terms.map((t) => ({ key: nextKey++, term: t.term, aliases: t.aliases.join(", "), note: t.note, source: t.source }));
}

function toTerms(drafts: Draft[]): GlossaryTerm[] {
  return drafts
    .filter((d) => d.term.trim())
    .map((d) => ({
      term: d.term.trim(),
      aliases: d.aliases
        .split(/[,;\n]/)
        .map((a) => a.trim())
        .filter(Boolean),
      note: d.note.trim(),
      source: d.source,
    }));
}

function same(a: GlossaryTerm[], b: GlossaryTerm[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The consultation's vocabulary: the names a transcription mistakes.
 * Dégagé by the « Vocabulaire » agent from the référentiel and the offers,
 * then kept by hand: a term, the forms it is heard as, a short note.
 */
export function GlossarySettings({ rfpId, canEdit }: { rfpId: string; canEdit: boolean }) {
  const query = useGlossary(rfpId);
  const { generate, save } = useGlossaryMutations(rfpId);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [touched, setTouched] = useState(false);
  const stored = useMemo(() => query.data?.glossary?.terms ?? [], [query.data]);
  const busy = glossaryBusy(query.data);

  // The form follows the stored list until the user touches it; a finished extraction reloads it.
  useEffect(() => {
    if (!touched) setDrafts(toDrafts(stored));
  }, [stored, touched]);

  if (query.isLoading) return <PageState kind="loading" title="Chargement du vocabulaire" className="min-h-0 py-6" />;
  if (query.error || !query.data) return <PageState kind="error" title="Le vocabulaire n'a pas pu être chargé" description={query.error?.message} className="min-h-0 py-6" />;

  const list = drafts ?? toDrafts(stored);
  const dirty = !same(toTerms(list), stored);
  const glossary = query.data.glossary;
  const job = query.data.job;

  // A touched term becomes the user's: the next extraction keeps it.
  const edit = (next: Draft[]) => {
    setTouched(true);
    setDrafts(next);
  };
  const update = (key: number, patch: Partial<Draft>) => edit(list.map((d) => (d.key === key ? { ...d, ...patch, source: "manual" } : d)));
  const remove = (key: number) => edit(list.filter((d) => d.key !== key));
  const add = () => edit([...list, { key: nextKey++, term: "", aliases: "", note: "", source: "manual" }]);
  const reset = () => {
    setTouched(false);
    setDrafts(toDrafts(stored));
  };

  const submit = async () => {
    try {
      await save.mutateAsync(toTerms(list));
      setTouched(false);
      toast.success("Vocabulaire enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Non enregistré.");
    }
  };
  const launch = async () => {
    try {
      await generate.mutateAsync();
      toast.success("Extraction lancée : le vocabulaire arrive dans une minute environ.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'extraction n'a pas pu être lancée.");
    }
  };

  const state = busy
    ? "Lecture du référentiel et des offres…"
    : job?.status === "failed"
      ? `L'extraction a échoué : ${job.error ?? glossary?.error ?? "erreur inconnue"}.`
      : glossary?.generated_at
        ? `Dégagé le ${formatDateTime(glossary.generated_at)}${glossary.cost > 0 ? ` · ${formatUsd(glossary.cost)}` : ""}${glossary.edited_at ? ` · retouché le ${formatDateTime(glossary.edited_at)}` : ""}`
        : glossary?.edited_at
          ? `Tenu à la main · ${formatDateTime(glossary.edited_at)}`
          : "Aucun vocabulaire pour l'instant.";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Les noms qu&apos;une transcription automatique déforme : fournisseurs, produits, sigles, noms du client. Les agents des soutenances, la dictée et la correction des transcripts s&apos;en servent pour les écrire exactement. Les « formes entendues » sont remplacées d&apos;office dans les transcripts.
        </p>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={launch} disabled={busy || generate.isPending}>
            {busy || generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {stored.length > 0 ? "Dégager à nouveau" : "Dégager le vocabulaire"}
          </Button>
        )}
      </div>
      <p className={cn("text-xs", job?.status === "failed" ? "text-destructive" : "text-muted-foreground")}>{state}</p>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun terme. Lancez l&apos;extraction, ou ajoutez les termes à la main.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="w-[26%] py-1 pr-2">Terme</th>
                <th className="w-[40%] py-1 pr-2">Formes entendues (séparées par des virgules)</th>
                <th className="py-1 pr-2">Note</th>
                <th className="w-[84px] py-1 pr-2">Origine</th>
                {canEdit && <th className="w-[40px]" />}
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.key} className="border-t border-border align-top">
                  <td className="py-1 pr-2">
                    <Input value={d.term} onChange={(e) => update(d.key, { term: e.target.value })} readOnly={!canEdit} aria-label="Terme" className="h-8" />
                  </td>
                  <td className="py-1 pr-2">
                    <Input value={d.aliases} onChange={(e) => update(d.key, { aliases: e.target.value })} readOnly={!canEdit} aria-label={`Formes entendues, ${d.term || "nouveau terme"}`} className="h-8" />
                  </td>
                  <td className="py-1 pr-2">
                    <Input value={d.note} onChange={(e) => update(d.key, { note: e.target.value })} readOnly={!canEdit} aria-label={`Note, ${d.term || "nouveau terme"}`} className="h-8" />
                  </td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{d.source === "manual" ? "À la main" : "Agent"}</td>
                  {canEdit && (
                    <td className="py-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(d.key)} aria-label={`Retirer ${d.term || "ce terme"}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={add}>
            <Plus className="h-4 w-4" />
            Ajouter un terme
          </Button>
          <div className="flex-1" />
          {dirty && (
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={save.isPending}>
              Annuler
            </Button>
          )}
          <Button type="button" size="sm" onClick={submit} disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Les termes propres à l&apos;organisation, valables pour toutes les consultations, se règlent dans{" "}
        <Link href="/dashboard/agents/assistance" className="inline-flex items-center gap-0.5 text-accent-foreground hover:underline underline-offset-2">
          Agents &amp; IA › Assistance à la saisie
          <ArrowUpRight className="h-3 w-3" />
        </Link>
        . L&apos;agent « Vocabulaire et transcripts » se règle dans Agents &amp; IA.
      </p>
    </div>
  );
}
