"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertCircle,
  Send,
  CheckCircle2,
  Loader,
  Copy,
  Check,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface TranscriptData {
  [supplierId: string]: {
    transcript: string;
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  };
}

export function PresentationTranscriptImport({
  rfpId,
  suppliers,
}: {
  rfpId: string;
  suppliers: Supplier[];
}) {
  const [transcripts, setTranscripts] = useState<TranscriptData>({});
  const [activeTab, setActiveTab] = useState<string>(suppliers[0]?.id || "");
  const [copied, setCopied] = useState(false);

  // Initialize transcript data for all suppliers
  useEffect(() => {
    const initialData: TranscriptData = {};
    suppliers.forEach((supplier) => {
      initialData[supplier.id] = {
        transcript: "",
        status: "idle",
      };
    });
    setTranscripts(initialData);
  }, [suppliers]);

  const handleTranscriptChange = (supplierId: string, value: string) => {
    setTranscripts((prev) => ({
      ...prev,
      [supplierId]: {
        ...prev[supplierId],
        transcript: value,
        status: "idle",
      },
    }));
  };

  const handleAnalyzeTranscript = async (supplierId: string) => {
    const transcript = transcripts[supplierId]?.transcript;

    if (!transcript || transcript.trim() === "") {
      toast.error("Le transcript ne peut pas être vide");
      return;
    }

    setTranscripts((prev) => ({
      ...prev,
      [supplierId]: {
        ...prev[supplierId],
        status: "loading",
      },
    }));

    try {
      const response = await fetch(`/api/rfps/${rfpId}/analyze-presentation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId,
          transcript: transcript.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start analysis");
      }

      const data = await response.json();

      setTranscripts((prev) => ({
        ...prev,
        [supplierId]: {
          ...prev[supplierId],
          status: "success",
          message: `Analyse lancée (ID: ${data.analysisId.substring(0, 8)}...)`,
        },
      }));

      toast.success("Analyse de la soutenance lancée");

      // Clear transcript after successful submission
      setTimeout(() => {
        setTranscripts((prev) => ({
          ...prev,
          [supplierId]: {
            ...prev[supplierId],
            transcript: "",
            status: "idle",
            message: undefined,
          },
        }));
      }, 2000);
    } catch (error) {
      console.error("Error starting analysis:", error);
      setTranscripts((prev) => ({
        ...prev,
        [supplierId]: {
          ...prev[supplierId],
          status: "error",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        },
      }));
      toast.error("Erreur lors du lancement de l'analyse");
    }
  };

  const handlePaste = async (supplierId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      handleTranscriptChange(supplierId, text);
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
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card className="rounded-2xl border border-slate-200 bg-blue-50/50 p-6 dark:border-slate-800 dark:bg-blue-950/20">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-slate-900 dark:text-white">
              Importer les transcripts de soutenance
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Collez le transcript brut de la soutenance de chaque fournisseur.
              N8N analysera le contenu et proposera des mises à jour pour les
              commentaires et réponses en fonction des exigences du RFP.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={copyTemplate}
              className="gap-2 mt-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Modèle copié
                </>
              ) : (
                "Copier le modèle"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs for each supplier */}
      {suppliers.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full gap-2 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
            {suppliers.map((supplier) => {
              const data = transcripts[supplier.id];
              const hasTranscript =
                data?.transcript && data.transcript.trim() !== "";
              const isSuccess = data?.status === "success";

              return (
                <TabsTrigger
                  key={supplier.id}
                  value={supplier.id}
                  className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
                >
                  {supplier.name}
                  {isSuccess && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {hasTranscript && !isSuccess && (
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {suppliers.map((supplier) => {
            const data = transcripts[supplier.id] || {
              transcript: "",
              status: "idle",
            };

            return (
              <TabsContent
                key={supplier.id}
                value={supplier.id}
                className="space-y-4 mt-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Transcript de soutenance
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePaste(supplier.id)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Coller
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Collez ici le transcript brut de la soutenance..."
                    value={data.transcript}
                    onChange={(e) =>
                      handleTranscriptChange(supplier.id, e.target.value)
                    }
                    disabled={data.status === "loading"}
                    className="min-h-[300px] font-mono text-sm resize-none"
                  />

                  {data.message && (
                    <p
                      className={`text-sm ${
                        data.status === "success"
                          ? "text-green-600 dark:text-green-400"
                          : data.status === "error"
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {data.message}
                    </p>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => handleAnalyzeTranscript(supplier.id)}
                      disabled={
                        data.status === "loading" || !data.transcript.trim()
                      }
                      className="gap-2"
                    >
                      {data.status === "loading" ? (
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
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {suppliers.length === 0 && (
        <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            Aucun fournisseur disponible pour importer les transcripts
          </p>
        </Card>
      )}
    </div>
  );
}
