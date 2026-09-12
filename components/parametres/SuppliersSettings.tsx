"use client";

import { useState } from "react";
import { RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageState } from "@/components/shell/PageState";
import { useSupplierStatusMutation, useVersionDetail } from "@/hooks/use-rfp-settings";
import { formatDate } from "@/lib/format";

type Row = { id: string; name: string; status: "active" | "shortlisted" | "removed"; removal_reason: string | null; removed_at: string | null };

/**
 * Which suppliers count in the active evaluation version. Removing one
 * (with a reason, kept with the version) takes it out of the decision and
 * the agents' analyses; restoring brings it back. Adding suppliers happens
 * in Préparation.
 */
export function SuppliersSettings({ rfpId, versionId, versionName, canEdit }: { rfpId: string; versionId: string | null; versionName: string | null; canEdit: boolean }) {
  const detail = useVersionDetail(rfpId, versionId);
  const mutation = useSupplierStatusMutation(rfpId, versionId);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  if (!versionId) return <p className="text-sm text-muted-foreground">Aucune version active : créez-en une ci-dessous.</p>;
  if (detail.isLoading) return <PageState kind="loading" title="Chargement des fournisseurs" className="min-h-0 py-6" />;
  if (detail.error || !detail.data) return <PageState kind="error" title="Les fournisseurs n'ont pas pu être chargés" description={detail.error?.message} className="min-h-0 py-6" />;

  const rows = detail.data.suppliers as Row[];
  const active = rows.filter((s) => s.status !== "removed");
  const removed = rows.filter((s) => s.status === "removed");

  const confirmRemove = async () => {
    if (!removing) return;
    const target = removing;
    const why = reason.trim();
    if (!why) return;
    setRemoving(null);
    setReason("");
    try {
      await mutation.mutateAsync({ supplierId: target.id, status: "removed", reason: why });
      toast.success(`${target.name} retiré de la version ${versionName ?? ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le fournisseur n'a pas pu être retiré.");
    }
  };

  const restore = async (s: Row) => {
    try {
      await mutation.mutateAsync({ supplierId: s.id, status: "active" });
      toast.success(`${s.name} réintégré.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le fournisseur n'a pas pu être réintégré.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Version <span className="font-medium text-foreground">{versionName}</span> · {active.length} fournisseur{active.length > 1 ? "s" : ""} évalué{active.length > 1 ? "s" : ""}
        {removed.length > 0 ? `, ${removed.length} retiré${removed.length > 1 ? "s" : ""}` : ""}. Les fournisseurs se déclarent dans Préparation ; ici on décide lesquels comptent dans cette version.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun fournisseur déclaré.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {active.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <span className="stamp stamp-pass">Évalué</span>
              {canEdit && (
                <Button type="button" variant="ghost" size="xs" disabled={mutation.isPending} onClick={() => setRemoving(s)}>
                  <UserMinus className="h-3.5 w-3.5" />
                  Retirer
                </Button>
              )}
            </li>
          ))}
          {removed.map((s) => (
            <li key={s.id} className="flex items-center gap-3 bg-rail px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-muted-foreground">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.removal_reason ? `« ${s.removal_reason} »` : "Sans motif"}
                  {s.removed_at ? ` · le ${formatDate(s.removed_at)}` : ""}
                </span>
              </span>
              <span className="stamp stamp-pending">Retiré</span>
              {canEdit && (
                <Button type="button" variant="ghost" size="xs" disabled={mutation.isPending} onClick={() => restore(s)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réintégrer
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer {removing?.name} de la version {versionName}</DialogTitle>
            <DialogDescription>Ses réponses restent ; il sort de la décision et des analyses des agents pour cette version. Le motif est conservé avec la version.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="removal-reason">Motif</Label>
            <Textarea id="removal-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Offre hors budget, dossier incomplet, désistement…" className="min-h-[80px] text-sm" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
              Annuler
            </Button>
            <Button type="button" disabled={!reason.trim() || mutation.isPending} onClick={confirmRemove}>
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
