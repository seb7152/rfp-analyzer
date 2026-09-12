"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageState } from "@/components/shell/PageState";
import { useGranolaConnector, useGranolaMutations } from "@/hooks/use-connectors";
import type { ConnectorKeyInfo } from "@/lib/connectors/keys";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function KeyRow({
  label,
  info,
  canEdit,
  hint,
  onSave,
  onRemove,
  saving,
}: {
  label: string;
  info: ConnectorKeyInfo | null;
  canEdit: boolean;
  hint: string;
  onSave: (key: string) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(!info);
  const [value, setValue] = useState("");
  const meta = (info?.verified_meta ?? {}) as { owner_name?: string | null; owner_email?: string | null; notes_30d?: number };
  const submit = async () => {
    try {
      await onSave(value.trim());
      setValue("");
      setEditing(false);
      toast.success("Clé vérifiée et enregistrée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La clé n'a pas pu être enregistrée.");
    }
  };
  const remove = async () => {
    try {
      await onRemove();
      setEditing(true);
      toast.success("Clé retirée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La clé n'a pas pu être retirée.");
    }
  };
  return (
    <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
      <Label className="pt-2">{label}</Label>
      <div className="flex flex-col gap-1.5">
        {info && !editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="num inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              grn_••••••••••••{info.last4}
            </span>
            {canEdit && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Remplacer
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={saving} onClick={remove}>
                  Retirer
                </Button>
              </>
            )}
          </div>
        ) : canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="grn_…" className="h-9 max-w-[360px] font-mono text-xs" aria-label={`${label} : nouvelle clé`} />
            <Button type="button" size="sm" disabled={value.trim().length < 8 || saving} onClick={submit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Vérifier et enregistrer
            </Button>
            {info && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            )}
          </div>
        ) : (
          <p className="pt-2 text-sm text-muted-foreground">Aucune clé.</p>
        )}
        <p className="max-w-[70ch] text-xs text-muted-foreground">
          {info?.verified_at
            ? `Vérifiée le ${formatDateTime(info.verified_at)}${meta.owner_name || meta.owner_email ? ` · espace de ${meta.owner_name ?? meta.owner_email}` : ""}${typeof meta.notes_30d === "number" ? ` · ${meta.notes_30d} réunion${meta.notes_30d > 1 ? "s" : ""} sur 30 jours` : ""}. `
            : ""}
          {hint}
        </p>
      </div>
    </div>
  );
}

/**
 * The Granola connector for the organisation: its key (admins), the
 * member's own key when allowed, and who may fetch a transcript. Values are
 * stored encrypted and never shown again.
 */
export function GranolaSettings({ organizationId, isAdmin }: { organizationId: string; isAdmin: boolean }) {
  const query = useGranolaConnector(organizationId);
  const { saveKey, removeKey, saveSettings } = useGranolaMutations(organizationId);
  if (query.isLoading) return <PageState kind="loading" title="Chargement du connecteur" className="min-h-0 py-10" />;
  if (query.error || !query.data) {
    return <PageState kind="error" title="Le connecteur n'a pas pu être lu" description={query.error?.message} action={<Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>} className="min-h-0 py-10" />;
  }
  const status = query.data;
  const connected = !!status.organization || !!status.personal || status.env_fallback;
  const setSetting = async (patch: Partial<typeof status.settings>) => {
    try {
      await saveSettings.mutateAsync({ ...status.settings, ...patch });
      toast.success("Réglage enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le réglage n'a pas été enregistré.");
    }
  };

  return (
    <section className="panel flex flex-col" aria-labelledby="granola-title">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="granola-title" className="text-base font-semibold">
            Granola
          </h2>
          <p className="text-xs text-muted-foreground">Lecture des réunions et de leurs transcripts pour les séances de soutenance. La clé se crée dans l&apos;application Granola, Settings › Connectors › API keys (offre Business).</p>
        </div>
        <span className={cn("stamp", connected ? "stamp-pass" : "stamp-pending")}>{connected ? "Connectée" : "Non connectée"}</span>
      </div>
      <div className="flex flex-col gap-5 px-4 py-4 md:px-5">
        <KeyRow
          label="Clé de l'organisation"
          info={status.organization}
          canEdit={isAdmin}
          hint={status.env_fallback && !status.organization ? "En développement, la clé GRANOLA_API_KEY de l'environnement sert de repli." : "Stockée chiffrée, jamais renvoyée au navigateur. Sert à tout membre autorisé qui n'a pas de clé personnelle."}
          onSave={(key) => saveKey.mutateAsync({ scope: "organization", key })}
          onRemove={() => removeKey.mutateAsync({ scope: "organization" })}
          saving={saveKey.isPending || removeKey.isPending}
        />
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
          <Label htmlFor="granola-personal" className="pt-1">
            Clés personnelles
          </Label>
          <div className="flex items-start gap-3">
            <Switch id="granola-personal" checked={status.settings.personal_keys} disabled={!isAdmin || saveSettings.isPending} onCheckedChange={(on) => setSetting({ personal_keys: on })} />
            <p className="max-w-[70ch] text-xs text-muted-foreground">Chaque membre peut enregistrer sa propre clé ci-dessous ; elle prime sur celle de l&apos;organisation pour lister ses réunions.</p>
          </div>
        </div>
        {status.settings.personal_keys && (
          <KeyRow
            label="Votre clé personnelle"
            info={status.personal}
            canEdit
            hint="Vos réunions Granola, pour les séances que vous préparez. Personne d'autre ne l'utilise."
            onSave={(key) => saveKey.mutateAsync({ scope: "personal", key })}
            onRemove={() => removeKey.mutateAsync({ scope: "personal" })}
            saving={saveKey.isPending || removeKey.isPending}
          />
        )}
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
          <Label htmlFor="granola-fetch" className="pt-1">
            Qui récupère
          </Label>
          <div className="flex items-start gap-3">
            <Switch id="granola-fetch" checked={status.settings.fetch_by === "pilots"} disabled={!isAdmin || saveSettings.isPending} onCheckedChange={(on) => setSetting({ fetch_by: on ? "pilots" : "evaluators" })} />
            <p className="max-w-[70ch] text-xs text-muted-foreground">
              {status.settings.fetch_by === "pilots" ? "Pilotes de la consultation seulement." : "Pilotes et évaluateurs."} Les autres voient le transcript une fois chargé ; ils ne parcourent pas la liste des réunions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
