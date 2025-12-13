"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TextEnhancerProps {
  currentText: string;
  responseText: string;
  requirementText: string;
  supplierNames?: string[];
  onEnhancementComplete: (enhancedText: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TextEnhancer({
  currentText,
  responseText,
  requirementText,
  supplierNames = [],
  onEnhancementComplete,
  className,
  disabled = false,
}: TextEnhancerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleEnhance = async () => {
    if (!currentText.trim()) {
      toast({
        title: "Aucun texte à améliorer",
        description: "Veuillez d'abord saisir du texte.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      // Create a dummy audio file to satisfy the API (we're using the same endpoint)
      const blob = new Blob([""], { type: "text/plain" });
      formData.append("audio", blob, "dummy.txt");
      formData.append("mode", "enhance");
      formData.append("currentText", currentText);
      formData.append("responseText", responseText);
      formData.append("requirementText", requirementText);
      formData.append("supplierNames", JSON.stringify(supplierNames));

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Échec de l'amélioration");
      }

      const data = await response.json();
      if (data.text) {
        onEnhancementComplete(data.text);
        toast({
          title: "Texte amélioré",
          description: "Le texte a été reformulé et complété par l'IA.",
        });
      } else {
        throw new Error("Aucun texte retourné");
      }
    } catch (err) {
      console.error("Error enhancing text:", err);
      toast({
        title: "Échec de l'amélioration",
        description:
          "Une erreur s'est produite lors de l'amélioration du texte.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleEnhance}
        disabled={disabled || isProcessing}
        className={cn(
          "h-8 w-8 rounded-full transition-all",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
        title="Améliorer avec l'IA"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-purple-500" />
        )}
      </Button>

      {/* Processing animation */}
      {isProcessing && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}
