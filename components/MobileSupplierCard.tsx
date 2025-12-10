"use client";

import React, { useState } from "react";
import {
    CheckCircle2,
    AlertCircle,
    Zap,
    Clock,
    Check,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RoundCheckbox } from "@/components/ui/round-checkbox";
import { StatusSwitch } from "@/components/ui/status-switch";
import { StarRating } from "@/components/ui/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface MobileSupplierCardProps {
    supplierName: string;
    responseText: string;
    aiScore: number;
    aiComment: string;
    status?: "pending" | "pass" | "partial" | "fail";
    isChecked?: boolean;
    manualScore?: number;
    manualComment?: string;
    questionText?: string;
    isSaving?: boolean;
    showSaved?: boolean;
    onStatusChange?: (status: "pending" | "pass" | "partial" | "fail") => void;
    onCheckChange?: (checked: boolean) => void;
    onScoreChange?: (score: number) => void;
    onCommentChange?: (comment: string) => void;
    onQuestionChange?: (question: string) => void;
    onCommentBlur?: () => void;
    onQuestionBlur?: () => void;
}

export function MobileSupplierCard({
    supplierName,
    responseText,
    aiScore,
    aiComment,
    status = "pending",
    isChecked = false,
    manualScore,
    manualComment = "",
    questionText = "",
    isSaving = false,
    showSaved = false,
    onStatusChange,
    onCheckChange,
    onScoreChange,
    onCommentChange,
    onQuestionChange,
    onCommentBlur,
    onQuestionBlur,
}: MobileSupplierCardProps) {
    const [commentTab, setCommentTab] = useState<"manual" | "ai">("manual");
    const currentScore = manualScore ?? aiScore;

    const getStatusBadge = () => {
        switch (status) {
            case "pass":
                return (
                    <Badge className="bg-green-500 px-3 py-1.5">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Conforme
                    </Badge>
                );
            case "partial":
                return (
                    <Badge className="bg-blue-500 px-3 py-1.5">
                        <Zap className="w-4 h-4 mr-1.5" />
                        Partiel
                    </Badge>
                );
            case "fail":
                return (
                    <Badge className="bg-red-500 px-3 py-1.5">
                        <AlertCircle className="w-4 h-4 mr-1.5" />
                        Non conforme
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="px-3 py-1.5">
                        <Clock className="w-4 h-4 mr-1.5" />
                        Attente
                    </Badge>
                );
        }
    };

    return (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
            {/* Header with supplier name and checkbox */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <RoundCheckbox
                        checked={isChecked}
                        onChange={(checked) => onCheckChange?.(checked)}
                    />
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        {supplierName}
                    </h3>
                </div>
                {getStatusBadge()}
            </div>

            {/* Status section */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex justify-center">
                    <StatusSwitch
                        value={status}
                        onChange={(newStatus) => {
                            onStatusChange?.(newStatus);
                            // Auto-check when status is set
                            if (newStatus !== "pending") {
                                onCheckChange?.(true);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Score section */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center gap-2">
                    <StarRating
                        score={currentScore}
                        interactive={true}
                        onScoreChange={onScoreChange}
                        size="lg"
                        showLabel={true}
                        isManual={manualScore !== undefined && manualScore !== null}
                        allowHalfStars={true}
                    />
                    {manualScore !== undefined && manualScore !== null ? (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Score manuel
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Score IA: {aiScore}/5
                        </span>
                    )}
                </div>
            </div>

            {/* Response section */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Réponse du fournisseur
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {responseText}
                    </p>
                </div>
            </div>

            {/* Comments section with tabs */}
            <div className="p-4">
                <Tabs value={commentTab} onValueChange={(v) => setCommentTab(v as "manual" | "ai")}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="manual">Votre commentaire</TabsTrigger>
                        <TabsTrigger value="ai">Commentaire IA</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 mt-0">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Votre commentaire
                                </span>
                                <div className="flex items-center gap-2">
                                    {isSaving && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Enregistrement...
                                        </span>
                                    )}
                                    {showSaved && !isSaving && (
                                        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                            <Check className="w-3 h-3" />
                                            Enregistré
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Textarea
                                value={manualComment}
                                onChange={(e) => onCommentChange?.(e.target.value)}
                                onBlur={() => onCommentBlur?.()}
                                placeholder="Ajoutez vos observations..."
                                className="min-h-32"
                            />
                        </div>

                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                Questions / Doutes
                            </div>
                            <Textarea
                                value={questionText}
                                onChange={(e) => onQuestionChange?.(e.target.value)}
                                onBlur={() => onQuestionBlur?.()}
                                placeholder="Posez vos questions..."
                                className="min-h-24"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="ai" className="mt-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Analyse IA
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {aiComment}
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
