"use client";

import { useState } from "react";
import { Check, Copy, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DATASETS,
  buildAgentPrompt,
  buildPrompt,
  buildSchema,
  type DatasetId,
  type ImportContext,
} from "@/lib/import/datasets";

/** A block of text with the discreet copy affordance in its top-right corner. */
function CopyBlock({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, fenêtre sans focus) : on repasse
      // par la sélection, qui marche partout.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      if (!ok) {
        toast.error("La copie a échoué.", { description: "Sélectionnez le texte pour le copier." });
        return;
      }
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={done ? "Copié" : label}
        className="absolute right-2.5 top-2.5 z-10 text-muted-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {done ? (
          <Check className="h-4 w-4 text-status-pass" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <pre className="max-h-[46vh] w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-rail p-3 pr-9 font-mono text-2xs leading-[16px] text-foreground">
        {text}
      </pre>
    </div>
  );
}

/**
 * What to hand to whoever writes the file. The prompt carries the schema, the
 * rules the import applies and the consultation's own vocabulary — domaines
 * existants, codes d'exigences, fournisseur — so a tableur can be converted
 * by an assistant without guessing.
 */
export function FormatDialog({
  dataset,
  context,
}: {
  dataset: DatasetId;
  context: ImportContext;
}) {
  const spec = DATASETS[dataset];
  const prompt = buildPrompt(dataset, context);
  const agentPrompt = buildAgentPrompt(dataset, context);
  const schema = JSON.stringify(buildSchema(dataset), null, 2);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileJson className="h-3.5 w-3.5" />
          Format attendu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Format attendu · {spec.label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Deux chemins : un prompt qui produit le fichier à déposer ici, un prompt pour un agent
            qui écrit directement par le connecteur. Les deux portent le vocabulaire de cette
            consultation.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="prompt">
          <TabsList>
            <TabsTrigger value="prompt">Prompt · fichier</TabsTrigger>
            <TabsTrigger value="agent">Prompt · agent</TabsTrigger>
            <TabsTrigger value="schema">Schéma JSON</TabsTrigger>
            <TabsTrigger value="champs">Champs</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-3">
            <p className="pb-2 text-xs text-muted-foreground">
              À coller dans un assistant, suivi du tableau à convertir.
            </p>
            <CopyBlock text={prompt} label="Copier le prompt" />
          </TabsContent>

          <TabsContent value="agent" className="mt-3">
            <p className="pb-2 text-xs text-muted-foreground">
              Pour un assistant connecté au connecteur MCP : il écrit lui-même, sans passer par
              cet écran.
            </p>
            <CopyBlock text={agentPrompt} label="Copier le prompt pour l'agent" />
          </TabsContent>

          <TabsContent value="schema" className="mt-3">
            <p className="pb-2 text-xs text-muted-foreground">
              JSON Schema, pour un agent ou une génération contrainte.
            </p>
            <CopyBlock text={schema} label="Copier le schéma" />
          </TabsContent>

          <TabsContent value="champs" className="mt-3">
            <div className="max-h-[46vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground">
                    <th className="py-1 pr-3 font-semibold">Champ</th>
                    <th className="py-1 pr-3 font-semibold">Type</th>
                    <th className="py-1 pr-3 font-semibold">Présence</th>
                    <th className="py-1 font-semibold">Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {spec.fields.map((f) => (
                    <tr key={f.name} className="border-t border-border align-top">
                      <td className="py-2 pr-3 font-mono text-xs">{f.name}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{f.type}</td>
                      <td className="py-2 pr-3 text-xs">
                        {f.required ? (
                          <span className="text-destructive">requis</span>
                        ) : (
                          <span className="text-muted-foreground">facultatif</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
