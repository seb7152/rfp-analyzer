"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useOrganization } from "@/hooks/use-organization";
import { useRfpPatch } from "@/hooks/use-rfp-settings";
import type { RFP } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const STATUSES: Array<{ id: RFP["status"]; label: string; hint: string }> = [
  { id: "in_progress", label: "En cours", hint: "Évaluation ouverte, visible sur l'accueil." },
  { id: "completed", label: "Terminée", hint: "Décision prise ; consultable, plus modifiée." },
  { id: "archived", label: "Archivée", hint: "Sortie de l'accueil, conservée pour l'historique." },
];

/**
 * The consultation itself: its state, peer review, and, for organisation
 * admins, the organisation it belongs to. Pilots only.
 */
export function ConsultationSettings({
  rfpId,
  status,
  peerReviewEnabled,
  organizationId,
  canEdit,
}: {
  rfpId: string;
  status: RFP["status"];
  peerReviewEnabled: boolean;
  organizationId: string;
  canEdit: boolean;
}) {
  const patch = useRfpPatch(rfpId);
  const { organizations } = useOrganization();
  const [targetOrg, setTargetOrg] = useState<string>("");
  const [confirmMove, setConfirmMove] = useState(false);
  const adminOrgs = organizations.filter((o) => o.role === "admin");
  const isAdminHere = adminOrgs.some((o) => o.id === organizationId);
  const targets = adminOrgs.filter((o) => o.id !== organizationId);
  const busy = patch.isPending;

  const setStatus = async (next: RFP["status"]) => {
    if (next === status) return;
    try {
      await patch.mutateAsync({ status: next });
      toast.success(`Consultation ${STATUSES.find((s) => s.id === next)?.label.toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le statut n'a pas été enregistré.");
    }
  };

  const setPeerReview = async (on: boolean) => {
    try {
      await patch.mutateAsync({ peer_review_enabled: on });
      toast.success(on ? "Relecture par un pair activée." : "Relecture par un pair désactivée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le réglage n'a pas été enregistré.");
    }
  };

  const move = async () => {
    setConfirmMove(false);
    try {
      await patch.mutateAsync({ organization_id: targetOrg });
      toast.success("Consultation déplacée. Les accès des analystes sont conservés ; ceux qui ne sont pas membres de la nouvelle organisation ne la verront plus.");
      setTargetOrg("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La consultation n'a pas pu être déplacée.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
        <Label className="pt-1">État</Label>
        <div>
          <div role="radiogroup" aria-label="État de la consultation" className="inline-flex rounded-md border border-input bg-background p-0.5">
            {STATUSES.map((s) => {
              const on = status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!canEdit || busy}
                  onClick={() => setStatus(s.id)}
                  className={cn(
                    "rounded-sm px-3 py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    on ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{STATUSES.find((s) => s.id === status)?.hint}</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
        <Label htmlFor="peer-review" className="pt-1">
          Relecture par un pair
        </Label>
        <div className="flex items-start gap-3">
          <Switch id="peer-review" checked={peerReviewEnabled} disabled={!canEdit || busy} onCheckedChange={setPeerReview} />
          <p className="text-xs text-muted-foreground">
            Chaque exigence évaluée passe par « soumise » puis « validée » ou « renvoyée » par un autre analyste avant de compter dans la décision. Sans, l'évaluation vaut dès qu'elle est cochée.
          </p>
        </div>
      </div>

      {isAdminHere && (
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
          <Label className="pt-1">Organisation</Label>
          {targets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Vous n&apos;administrez pas d&apos;autre organisation : la consultation reste ici.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={targetOrg} onValueChange={setTargetOrg} disabled={busy}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Déplacer vers…" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" disabled={!targetOrg || busy} onClick={() => setConfirmMove(true)}>
                Déplacer
              </Button>
              <p className="basis-full text-xs text-muted-foreground">
                Réservé aux administrateurs des deux organisations. Les documents, réponses et versions suivent ; les analystes gardent leur accès s&apos;ils sont membres de l&apos;organisation d&apos;arrivée.
              </p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmMove} onOpenChange={setConfirmMove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déplacer la consultation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle passe dans « {targets.find((o) => o.id === targetOrg)?.name} ». Les membres de l&apos;organisation actuelle qui n&apos;y sont pas membres perdent l&apos;accès.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={move}>Déplacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
