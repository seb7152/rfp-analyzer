"use client";

import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVersion } from "@/contexts/VersionContext";
import { useVersionMutations } from "@/hooks/use-rfp-settings";
import type { EvaluationVersionWithStats } from "@/lib/supabase/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FRESH = "__fresh__";

/**
 * The evaluation versions: one is active and receives the work; the others
 * keep their snapshot of responses and supplier statuses. Create (from
 * scratch or as a copy), rename, activate. Nothing is deleted.
 */
export function VersionsSettings({ rfpId, canEdit }: { rfpId: string; canEdit: boolean }) {
  const { versions, activeVersion, isLoading, setActiveVersionId, refreshVersions } = useVersion();
  const { create, rename } = useVersionMutations(rfpId, refreshVersions);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EvaluationVersionWithStats | null>(null);
  const [form, setForm] = useState({ name: "", description: "", copyFrom: FRESH, inherit: true });
  const [activating, setActivating] = useState<string | null>(null);

  const ordered = [...versions].sort((a, b) => b.version_number - a.version_number);
  const busy = create.isPending || rename.isPending || !!activating;

  const openCreate = () => {
    setForm({ name: `Version ${versions.length + 1}`, description: "", copyFrom: activeVersion?.id ?? FRESH, inherit: true });
    setCreating(true);
  };

  const submitCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await create.mutateAsync({
        version_name: form.name.trim(),
        description: form.description.trim() || undefined,
        copy_from_version_id: form.copyFrom === FRESH ? undefined : form.copyFrom,
        inherit_supplier_status: form.copyFrom === FRESH ? undefined : form.inherit,
      });
      setCreating(false);
      toast.success(`Version « ${form.name.trim()} » créée et activée.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La version n'a pas pu être créée.");
    }
  };

  const submitRename = async () => {
    if (!editing || !form.name.trim()) return;
    try {
      await rename.mutateAsync({ versionId: editing.id, version_name: form.name.trim(), description: form.description.trim() });
      setEditing(null);
      toast.success("Version renommée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La version n'a pas pu être renommée.");
    }
  };

  const activate = async (v: EvaluationVersionWithStats) => {
    setActivating(v.id);
    try {
      await setActiveVersionId(v.id);
      toast.success(`Version « ${v.version_name} » activée pour toute l'équipe.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La version n'a pas pu être activée.");
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          La version active reçoit les notes et les analyses ; les autres gardent leur état. Activer une version change ce que toute l&apos;équipe voit.
        </p>
        {canEdit && (
          <Button type="button" size="sm" variant="outline" onClick={openCreate} disabled={busy}>
            <Plus className="h-4 w-4" />
            Nouvelle version
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des versions…</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune version : la première se crée avec le bouton ci-dessus.</p>
      ) : (
        <ol className="divide-y divide-border rounded-md border border-border">
          {ordered.map((v) => (
            <li key={v.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5", v.is_active && "bg-accent/30")}>
              <span className="num w-8 shrink-0 text-xs text-muted-foreground">V{v.version_number}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{v.version_name}</span>
                  {v.is_active && <span className="stamp stamp-pass">Active</span>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {v.description ? `${v.description} · ` : ""}
                  créée le {formatDate(v.created_at)}
                </span>
              </span>
              <span className="num text-xs text-muted-foreground" title="Fournisseurs évalués / retirés · réponses cochées">
                {v.active_suppliers_count} fourn.{v.removed_suppliers_count > 0 ? ` · ${v.removed_suppliers_count} retiré${v.removed_suppliers_count > 1 ? "s" : ""}` : ""} · {v.completion_percentage} %
              </span>
              {canEdit && (
                <span className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    mode="icon"
                    aria-label={`Renommer ${v.version_name}`}
                    disabled={busy}
                    onClick={() => {
                      setForm({ name: v.version_name, description: v.description ?? "", copyFrom: FRESH, inherit: true });
                      setEditing(v);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!v.is_active && (
                    <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => activate(v)}>
                      <Check className="h-3.5 w-3.5" />
                      {activating === v.id ? "Activation" : "Activer"}
                    </Button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Créer */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle version d&apos;évaluation</DialogTitle>
            <DialogDescription>Elle devient la version active dès sa création : l&apos;équipe travaille dessus aussitôt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="version-name">Nom</Label>
              <Input id="version-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Après soutenances" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version-description">Description</Label>
              <Textarea id="version-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ce qui change dans cette version" className="min-h-[60px] text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Point de départ</Label>
              <Select value={form.copyFrom} onValueChange={(v) => setForm({ ...form, copyFrom: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FRESH}>Vide : aucune note, tous les fournisseurs</SelectItem>
                  {ordered.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      Copie de V{v.version_number} · {v.version_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.copyFrom !== FRESH && (
                <label className="flex items-center gap-2 pt-1 text-sm">
                  <input type="checkbox" checked={form.inherit} onChange={(e) => setForm({ ...form, inherit: e.target.checked })} className="h-3.5 w-3.5" />
                  Reprendre aussi les fournisseurs retirés de cette version
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={!form.name.trim() || create.isPending} onClick={submitCreate}>
              {create.isPending ? "Création" : "Créer et activer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renommer */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la version V{editing?.version_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-version-name">Nom</Label>
              <Input id="edit-version-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-version-description">Description</Label>
              <Textarea id="edit-version-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[60px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button type="button" disabled={!form.name.trim() || rename.isPending} onClick={submitRename}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
