"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FinancialTemplateLine } from "@/lib/financial/calculations";

interface EditLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: FinancialTemplateLine;
  allLines?: FinancialTemplateLine[];
  onLineUpdated: (line: FinancialTemplateLine) => void;
}

export function EditLineModal({
  isOpen,
  onClose,
  line,
  allLines = [],
  onLineUpdated,
}: EditLineModalProps) {
  const [lineCode, setLineCode] = useState(line.line_code);
  const [name, setName] = useState(line.name);
  const [lineType, setLineType] = useState<"setup" | "recurrent">(
    line.line_type
  );
  const [recurrenceType, setRecurrenceType] = useState<"monthly" | "yearly">(
    line.recurrence_type || "monthly"
  );
  const [customFormula, setCustomFormula] = useState(line.custom_formula || "");
  const [description, setDescription] = useState(line.description || "");
  const [parentId, setParentId] = useState<string | "root">(
    line.parent_id || "root"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update state when line prop changes
  useEffect(() => {
    setLineCode(line.line_code);
    setName(line.name);
    setLineType(line.line_type);
    setRecurrenceType(line.recurrence_type || "monthly");
    setCustomFormula(line.custom_formula || "");
    setDescription(line.description || "");
    setParentId(line.parent_id || "root");
  }, [line]);

  // Helper to identify invalid parents (self and descendants) to prevent cycles
  const getStatusForLine = (
    candidateId: string
  ): { disabled: boolean; reason?: string } => {
    if (candidateId === line.id)
      return {
        disabled: true,
        reason: "Impossible de définir la ligne comme son propre parent",
      };

    // Check if candidate is a descendant
    let current = allLines.find((l) => l.id === candidateId);
    // Simple iterative check up the tree from candidate to see if we hit 'line.id'
    // While this is "is ancestor" check, here we want to avoid reparenting TO a descendant.
    // So if 'line.id' is an ancestor of 'candidateId', then 'candidateId' is a descendant of 'line.id'.
    // We walk up from candidate.
    let isDescendant = false;
    while (current?.parent_id) {
      if (current.parent_id === line.id) {
        isDescendant = true;
        break;
      }
      current = allLines.find((l) => l.id === current?.parent_id);
    }

    if (isDescendant)
      return {
        disabled: true,
        reason: "Impossible de déplacer vers une ligne enfant (cycle)",
      };

    return { disabled: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lineCode.trim()) {
      toast({
        title: "Erreur",
        description: "Le code de ligne est requis",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de ligne est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/financial-template-lines/${line.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          line_code: lineCode.trim(),
          name: name.trim(),
          line_type: lineType,
          recurrence_type: lineType === "recurrent" ? recurrenceType : null,
          custom_formula: customFormula.trim() || null,
          description: description.trim() || null,
          parent_id: parentId === "root" ? null : parentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update line");
      }

      toast({
        title: "Succès",
        description: "Ligne modifiée avec succès",
      });

      onLineUpdated(data.line);
      onClose();
    } catch (error) {
      console.error("Error updating line:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Échec de la modification de la ligne",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la ligne</DialogTitle>
          <DialogDescription>
            Modifiez les propriétés de cette ligne de coût ou déplacez-la.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lineCode">Code *</Label>
              <Input
                id="lineCode"
                placeholder="Ex: INF-01"
                value={lineCode}
                onChange={(e) => setLineCode(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                placeholder="Ex: Infrastructure"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Ligne Parente</Label>
            <Select
              value={parentId}
              onValueChange={setParentId}
              disabled={isSubmitting}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="Sélectionnez un parent" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="root">-- Aucune (Racine) --</SelectItem>
                {allLines
                  .filter((l) => l.id !== line.id) // Basic filter, UI disabling for complex logic
                  .sort((a, b) => a.line_code.localeCompare(b.line_code))
                  .map((l) => {
                    const status = getStatusForLine(l.id);
                    return (
                      <SelectItem
                        key={l.id}
                        value={l.id}
                        disabled={status.disabled}
                        className={
                          status.disabled ? "opacity-50 cursor-not-allowed" : ""
                        }
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground mr-1">
                            {l.line_code}
                          </span>
                          {l.name}
                          {status.disabled && (
                            <span className="text-xs text-red-400 italic ml-2">
                              ({status.reason})
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type de coût *</Label>
            <RadioGroup
              value={lineType}
              onValueChange={(value) =>
                setLineType(value as "setup" | "recurrent")
              }
              disabled={isSubmitting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="setup" id="setup" />
                <Label htmlFor="setup" className="font-normal">
                  Setup (coût ponctuel)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurrent" id="recurrent" />
                <Label htmlFor="recurrent" className="font-normal">
                  Récurrent (coût périodique)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {lineType === "recurrent" && (
            <div className="space-y-2">
              <Label htmlFor="recurrence">Fréquence *</Label>
              <Select
                value={recurrenceType}
                onValueChange={(value) =>
                  setRecurrenceType(value as "monthly" | "yearly")
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="recurrence">
                  <SelectValue placeholder="Sélectionnez une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customFormula">
              Formule personnalisée (optionnel)
            </Label>
            <Textarea
              id="customFormula"
              placeholder="Ex: {setup_cost} * {quantity}"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Variables disponibles: {"{setup_cost}"}, {"{recurrent_cost}"},{" "}
              {"{quantity}"}, {"{total_period_years}"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Aide (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Ajoutez une description ou une aide contextuelle pour cette ligne..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
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
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
