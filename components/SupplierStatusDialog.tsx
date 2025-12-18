"use client";

import { useState } from "react";
import { useVersion } from "@/contexts/VersionContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";

interface SupplierStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  currentStatus: "active" | "shortlisted" | "removed";
  removalReason?: string;
  onSuccess?: () => void;
}

export function SupplierStatusDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  currentStatus,
  removalReason,
  onSuccess,
}: SupplierStatusDialogProps) {
  const { activeVersion } = useVersion();

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRemoving = currentStatus !== "removed";
  const actionText = isRemoving ? "supprimer" : "restaurer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeVersion?.id) {
      setError("Aucune version active sélectionnée");
      return;
    }

    if (isRemoving && !reason.trim()) {
      setError("Veuillez fournir une justification pour la suppression");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newStatus = isRemoving ? "removed" : "active";

      const response = await fetch(
        `/api/rfps/${activeVersion.rfp_id}/versions/${activeVersion.id}/suppliers/${supplierId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shortlist_status: newStatus,
            removal_reason: isRemoving ? reason.trim() : null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de la mise à jour");
      }

      onSuccess?.();
      onOpenChange(false);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRemoving ? (
              <Trash2 className="h-5 w-5 text-red-600" />
            ) : (
              <RotateCcw className="h-5 w-5 text-green-600" />
            )}
            {isRemoving
              ? "Supprimer le fournisseur"
              : "Restaurer le fournisseur"}
          </DialogTitle>
          <DialogDescription>
            {isRemoving ? (
              <>
                Vous êtes sur le point de supprimer{" "}
                <strong>{supplierName}</strong> de cette version. Le fournisseur
                ne sera plus visible dans les évaluations mais les données
                seront conservées.
              </>
            ) : (
              <>
                Vous êtes sur le point de restaurer{" "}
                <strong>{supplierName}</strong> dans cette version. Le
                fournisseur sera de nouveau visible dans les évaluations.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentStatus === "removed" && removalReason && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Raison de la suppression précédente :</strong>{" "}
                {removalReason}
              </AlertDescription>
            </Alert>
          )}

          {isRemoving && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Justification de la suppression{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Veuillez expliquer pourquoi ce fournisseur est supprimé..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant={isRemoving ? "destructive" : "primary"}
              disabled={loading}
            >
              {loading ? "Traitement..." : actionText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
