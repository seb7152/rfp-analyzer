"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, HelpCircle, Copy, Bot } from "lucide-react";

interface ResponseFocusModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    supplierName: string;
    responseText: string;
    aiComment: string;
    manualComment: string;
    onCommentChange?: (comment: string) => void;
    onCommentBlur?: () => void;
    questionText: string;
    onQuestionChange?: (question: string) => void;
    onQuestionBlur?: () => void;
}

export function ResponseFocusModal({
    isOpen,
    onOpenChange,
    supplierName,
    responseText,
    aiComment,
    manualComment,
    onCommentChange,
    onCommentBlur,
    questionText,
    onQuestionChange,
    onQuestionBlur,
}: ResponseFocusModalProps) {
    const [activeTab, setActiveTab] = React.useState("comment");

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl">Détails de l'évaluation</DialogTitle>
                        <Badge variant="outline" className="font-normal">
                            {supplierName}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Vue détaillée pour la lecture et l'édition des commentaires
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    {/* Left Column: Response Text */}
                    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950/50">
                        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                Réponse du fournisseur
                            </h3>
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {responseText}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Column: Inputs */}
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Top Half: Comments & AI Analysis */}
                        <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-800">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <TabsList className="h-8">
                                        <TabsTrigger value="comment" className="text-xs gap-2">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Votre commentaire
                                        </TabsTrigger>
                                        <TabsTrigger value="ai" className="text-xs gap-2">
                                            <Bot className="w-3.5 h-3.5" />
                                            Analyse IA
                                        </TabsTrigger>
                                    </TabsList>

                                    {activeTab === "comment" && manualComment.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                            {manualComment.length} caractères
                                        </span>
                                    )}

                                    {activeTab === "ai" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigator.clipboard.writeText(aiComment)}
                                            className="h-7 text-xs gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copier
                                        </Button>
                                    )}
                                </div>

                                <TabsContent value="comment" className="flex-1 p-4 mt-0 data-[state=active]:flex flex-col bg-white dark:bg-slate-950 outline-none">
                                    <Textarea
                                        value={manualComment}
                                        onChange={(e) => onCommentChange?.(e.target.value)}
                                        onBlur={onCommentBlur}
                                        placeholder="Ajoutez vos observations, points forts, points faibles..."
                                        className="w-full h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 p-2 text-sm leading-relaxed"
                                    />
                                </TabsContent>

                                <TabsContent value="ai" className="flex-1 p-0 mt-0 data-[state=active]:flex flex-col bg-white dark:bg-slate-950 outline-none overflow-hidden">
                                    <ScrollArea className="flex-1 p-6">
                                        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                            {aiComment}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Bottom Half: Questions */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-amber-500" />
                                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                        Questions / Doutes
                                    </h3>
                                </div>
                                {questionText.length > 0 && (
                                    <span className="text-xs text-slate-400">
                                        {questionText.length} caractères
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 p-4 bg-white dark:bg-slate-950">
                                <Textarea
                                    value={questionText}
                                    onChange={(e) => onQuestionChange?.(e.target.value)}
                                    onBlur={onQuestionBlur}
                                    placeholder="Questions à poser au fournisseur ou points à éclaircir..."
                                    className="w-full h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 p-2 text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
