"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { RFPAccessLevel } from "@/types/user";
import { canUseAIFeatures } from "@/lib/permissions/ai-permissions";

interface TextEnhancerProps {
  currentText: string;
  responseText: string;
  requirementText: string;
  supplierName: string;
  supplierNames?: string[];
  userAccessLevel?: RFPAccessLevel;
  onEnhancementComplete: (enhancedText: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TextEnhancer({
  currentText,
  responseText,
  requirementText,
  supplierName,
  supplierNames = [],
  userAccessLevel,
  onEnhancementComplete,
  className,
  disabled = false,
}: TextEnhancerProps) {
  // Hide TextEnhancer if user doesn't have AI access
  const hasAIAccess = canUseAIFeatures(userAccessLevel);
  if (!hasAIAccess) {
    return null;
  }
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRevert, setShowRevert] = useState(false);
  const [originalText, setOriginalText] = useState("");
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

    // Save original text for revert option
    setOriginalText(currentText);
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
      formData.append("supplierName", supplierName);
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

        // Show revert button for 5 seconds
        setShowRevert(true);
        setTimeout(() => {
          setShowRevert(false);
        }, 5000);
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

  const handleRevert = () => {
    onEnhancementComplete(originalText);
    setShowRevert(false);
    toast({
      title: "Annulation",
      description: "Le texte original a été restauré.",
    });
  };

  return (
    <div className={cn("relative flex items-center gap-0.5", className)}>
      {/* Revert button - visible for 5 seconds after enhancement, positioned to the left */}
      {showRevert && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRevert}
          className="h-7 w-7 rounded-full transition-all animate-in fade-in slide-in-from-right-2 duration-200"
          title="Annuler l'amélioration"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </Button>
      )}

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
