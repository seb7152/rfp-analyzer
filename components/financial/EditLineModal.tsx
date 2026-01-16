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
  onLineUpdated: (line: FinancialTemplateLine) => void;
}

export function EditLineModal({
  isOpen,
  onClose,
  line,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update state when line prop changes
  useEffect(() => {
    setLineCode(line.line_code);
    setName(line.name);
    setLineType(line.line_type);
    setRecurrenceType(line.recurrence_type || "monthly");
    setCustomFormula(line.custom_formula || "");
  }, [line]);

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
            Modifiez les propriétés de cette ligne de coût.
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
