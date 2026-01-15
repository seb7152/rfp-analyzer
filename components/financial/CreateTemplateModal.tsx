"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfpId: string;
  onTemplateCreated: (template: any) => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  rfpId,
  onTemplateCreated,
}: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [totalPeriodYears, setTotalPeriodYears] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du template est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/rfps/${rfpId}/financial-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          total_period_years: totalPeriodYears,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create template");
      }

      toast({
        title: "Succès",
        description: "Template créé avec succès",
      });

      onTemplateCreated(data.template);
      setName("");
      setTotalPeriodYears(3);
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la création du template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un template financier</DialogTitle>
          <DialogDescription>
            Définissez le nom et la période de calcul TCO pour votre template financier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du template</Label>
            <Input
              id="name"
              placeholder="Ex: Grille financière 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Période TCO (années)</Label>
            <Select
              value={totalPeriodYears.toString()}
              onValueChange={(value) => setTotalPeriodYears(parseInt(value))}
              disabled={isSubmitting}
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="Sélectionnez une période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 an</SelectItem>
                <SelectItem value="3">3 ans</SelectItem>
                <SelectItem value="5">5 ans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
