"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateRFPDialogProps {
  organizationId: string;
  onSuccess?: (rfp: { id: string; title: string }) => void;
  onClose: () => void;
}

/**
 * Creating a consultation asks for two facts and lands on its preparation
 * hub, where the next action is stated.
 */
export function CreateRFPDialog({
  organizationId,
  onSuccess,
  onClose,
}: CreateRFPDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/rfps/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, organizationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "La consultation n'a pas pu être créée.");
        return;
      }
      onSuccess?.(data.rfp);
      onClose();
      if (data.rfp?.id) {
        router.push(`/dashboard/rfp/${data.rfp.id}/preparation`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La consultation n'a pas pu être créée."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nouvelle consultation</DialogTitle>
            <DialogDescription>
              Le cahier des charges, les fournisseurs et les réponses se déposent ensuite,
              depuis le plan de préparation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rfp-title">Titre</Label>
            <Input
              id="rfp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Gestion technique du patrimoine"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rfp-description">Description</Label>
            <Textarea
              id="rfp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objet, périmètre, calendrier"
              rows={3}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer la consultation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
