"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface SaveVersionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, mode: "new" | "replace") => void;
    isLoading: boolean;
    defaultName?: string;
}

export function SaveVersionModal({ isOpen, onClose, onSave, isLoading, defaultName }: SaveVersionModalProps) {
    const [name, setName] = useState("");
    const [mode, setMode] = useState<"new" | "replace">("new");

    useEffect(() => {
        if (isOpen && defaultName) {
            setName(defaultName);
        }
    }, [isOpen, defaultName]);

    const handleSave = () => {
        onSave(name, mode);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sauvegarder les modifications</DialogTitle>
                    <DialogDescription>
                        Vous avez effectué des modifications sur cette version.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <RadioGroup value={mode} onValueChange={(v) => setMode(v as "new" | "replace")}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="new" />
                            <Label htmlFor="new">Créer une nouvelle version</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="replace" id="replace" />
                            <Label htmlFor="replace">Remplacer la version actuelle</Label>
                        </div>
                    </RadioGroup>

                    <div className="space-y-2">
                        <Label htmlFor="versionName">Nom de la version {mode === 'new' ? '(Nouvelle)' : '(Modifiée)'}</Label>
                        <Input
                            id="versionName"
                            placeholder={mode === 'new' ? "Ex: Révision v2" : "Nom actuel"}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sauvegarder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
