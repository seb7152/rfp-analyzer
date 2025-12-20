"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Copy, Loader } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface PresentationImportModalProps {
  rfpId: string;
  suppliers: Supplier[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PresentationImportModal({
  rfpId,
  suppliers,
  isOpen,
  onOpenChange,
  onSuccess,
}: PresentationImportModalProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers[0]?.id || ""
  );
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyzeTranscript = async () => {
    if (!transcript.trim()) {
      toast.error("Le transcript ne peut pas être vide");
      return;
    }

    if (!selectedSupplierId) {
      toast.error("Veuillez sélectionner un fournisseur");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/analyze-presentation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierId: selectedSupplierId,
            transcript: transcript.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start analysis");
      }

      await response.json();

      toast.success("Analyse de la soutenance lancée");
      setTranscript("");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error starting analysis:", error);
      toast.error("Erreur lors du lancement de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTranscript(text);
      toast.success("Transcript collé");
    } catch {
      toast.error("Impossible de copier depuis le presse-papiers");
    }
  };

  const copyTemplate = () => {
    const template = `Transcript de soutenance - [Nom du fournisseur]

Points clés abordés:
-

Forces de la présentation:
-

Domaines de clarification:
-

Prochaines étapes:
- `;
    navigator.clipboard.writeText(template);
    setCopied(true);
    toast.success("Modèle copié");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer un transcript de soutenance</DialogTitle>
          <DialogDescription>
            Collez le transcript brut de la soutenance. N8N analysera le contenu
            et proposera des mises à jour pour les commentaires et réponses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fournisseur
            </label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transcript Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Transcript de soutenance
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePaste}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Coller
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTemplate}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copié" : "Modèle"}
                </Button>
              </div>
            </div>

            <Textarea
              placeholder="Collez ici le transcript brut de la soutenance..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={loading}
              className="min-h-[300px] font-mono text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAnalyzeTranscript}
              disabled={loading || !transcript.trim() || !selectedSupplierId}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Analyser
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
