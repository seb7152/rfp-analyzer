"use client";

import { useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageState } from "@/components/shell/PageState";
import { initialsOf } from "@/components/shell/UserMenu";
import { useAuth } from "@/hooks/use-auth";
import { useAssignmentMutations, useOrgMembers, useRfpAssignments, type RfpAccessLevel, type RfpAssignment } from "@/hooks/use-rfp-settings";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const LEVELS: Array<{ id: RfpAccessLevel; label: string; hint: string }> = [
  { id: "owner", label: "Pilote", hint: "Paramètres, agents, décision, tout." },
  { id: "evaluator", label: "Évaluateur", hint: "Note, commente, accepte les propositions." },
  { id: "viewer", label: "Lecteur", hint: "Consulte sans modifier." },
];

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l.label])) as Record<RfpAccessLevel, string>;

/**
 * Who works on the consultation and with which rights. Members of the
 * organisation are added with a role, the role changes in place, removal
 * asks first. Organisation admins see everything without being listed.
 */
export function AnalystsSettings({ rfpId, organizationId, canEdit }: { rfpId: string; organizationId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const assignments = useRfpAssignments(rfpId);
  const members = useOrgMembers(canEdit ? organizationId : null);
  const { add, changeRole, remove } = useAssignmentMutations(rfpId);
  const [memberId, setMemberId] = useState("");
  const [level, setLevel] = useState<RfpAccessLevel>("evaluator");
  const [removing, setRemoving] = useState<RfpAssignment | null>(null);

  const rows = assignments.data?.assignments ?? [];
  const assignedIds = useMemo(() => new Set(rows.map((r) => r.user_id)), [rows]);
  const candidates = (members.data?.members ?? []).filter((m) => !assignedIds.has(m.id));
  const busy = add.isPending || changeRole.isPending || remove.isPending;

  const submit = async () => {
    if (!memberId) return;
    try {
      await add.mutateAsync({ user_id: memberId, access_level: level });
      toast.success("Analyste ajouté.");
      setMemberId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'analyste n'a pas pu être ajouté.");
    }
  };

  const setRole = async (a: RfpAssignment, next: RfpAccessLevel) => {
    if (next === a.access_level) return;
    try {
      await changeRole.mutateAsync({ user_id: a.user_id, access_level: next });
      toast.success(`${a.user?.full_name || a.user?.email || "Analyste"} : ${LEVEL_LABEL[next].toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le rôle n'a pas pu être changé.");
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    try {
      await remove.mutateAsync({ user_id: target.user_id });
      toast.success("Analyste retiré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'analyste n'a pas pu être retiré.");
    }
  };

  if (assignments.isLoading) return <PageState kind="loading" title="Chargement des analystes" className="min-h-0 py-6" />;
  if (assignments.error) return <PageState kind="error" title="Les analystes n'ont pas pu être chargés" description={assignments.error.message} className="min-h-0 py-6" />;

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun analyste affecté. Les administrateurs de l&apos;organisation ont accès sans être listés.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((a) => {
            const self = a.user_id === user?.id;
            const name = a.user?.full_name || a.user?.email || "Utilisateur";
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-2xs font-bold text-accent-foreground">{initialsOf(name, "?")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {name}
                    {self && <span className="text-muted-foreground"> · vous</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.user?.email}
                    {a.assigned_at ? ` · depuis le ${formatDate(a.assigned_at)}` : ""}
                  </span>
                </span>
                {canEdit ? (
                  <Select value={a.access_level} onValueChange={(v) => setRole(a, v as RfpAccessLevel)} disabled={busy}>
                    <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Rôle de ${name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">{LEVEL_LABEL[a.access_level]}</span>
                )}
                {canEdit && (
                  <Button type="button" variant="ghost" size="xs" mode="icon" aria-label={`Retirer ${name}`} disabled={busy} onClick={() => setRemoving(a)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-rail px-3 py-3">
          <div className="min-w-[220px] flex-1 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Ajouter un membre de l&apos;organisation</span>
            <Select value={memberId} onValueChange={setMemberId} disabled={busy || members.isLoading}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder={members.isLoading ? "Chargement…" : candidates.length === 0 ? "Tous les membres sont déjà affectés" : "Choisir un membre"} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email}
                    {m.full_name ? ` · ${m.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Rôle</span>
            <Select value={level} onValueChange={(v) => setLevel(v as RfpAccessLevel)} disabled={busy}>
              <SelectTrigger className="h-9 w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="block">{l.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" disabled={!memberId || busy} onClick={submit} className={cn("h-9")}>
            <UserPlus className="h-4 w-4" />
            Ajouter
          </Button>
          <p className="basis-full text-2xs text-muted-foreground">{LEVELS.map((l) => `${l.label} : ${l.hint}`).join(" ")}</p>
        </div>
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer {removing?.user?.full_name || removing?.user?.email} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.user_id === user?.id
                ? "Vous vous retirez vous-même : vous ne verrez plus cette consultation sauf si vous administrez l'organisation."
                : "Ses notes et commentaires restent ; seul son accès à la consultation est retiré."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
