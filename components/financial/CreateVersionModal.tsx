"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCreateFinancialVersion } from "@/hooks/use-financial-data";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfpId: string;
  supplierId: string;
  supplierName: string;
}

export function CreateVersionModal({
  isOpen,
  onClose,
  rfpId,
  supplierId,
  supplierName,
}: CreateVersionModalProps) {
  const [versionName, setVersionName] = useState("");
  const [versionDate, setVersionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { mutate: createVersion, isLoading } = useCreateFinancialVersion(rfpId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVersion(
      { supplierId, versionName, versionDate },
      {
        onSuccess: () => {
          toast.success("Version créée avec succès");
          setVersionName("");
          onClose();
        },
        onError: (error: any) => {
          toast.error(`Erreur: ${error.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle version d'offre</DialogTitle>
          <DialogDescription>
            Créez une nouvelle version pour {supplierName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="versionName">Nom de la version (optionnel)</Label>
            <Input
              id="versionName"
              placeholder="Ex: Version 2"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="versionDate">Date</Label>
            <Input
              id="versionDate"
              type="date"
              value={versionDate}
              onChange={(e) => setVersionDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
