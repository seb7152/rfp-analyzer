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
  buildPrompt,
  buildSchema,
  type DatasetId,
  type ImportContext,
} from "@/lib/import/datasets";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        } catch {
          toast.error("La copie a échoué.", { description: "Sélectionnez le texte pour le copier." });
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copié" : label}
    </Button>
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
            Le prompt contient le schéma et le vocabulaire de cette consultation. Collez-le dans un
            assistant avec votre tableur : la sortie s&apos;importe telle quelle.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="prompt">
          <TabsList>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="schema">Schéma JSON</TabsTrigger>
            <TabsTrigger value="champs">Champs</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-3">
            <div className="flex items-center justify-between gap-3 pb-2">
              <p className="text-xs text-muted-foreground">
                À coller dans un assistant, suivi du tableau à convertir.
              </p>
              <CopyButton text={prompt} label="Copier le prompt" />
            </div>
            <pre className="max-h-[46vh] w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-rail p-3 font-mono text-2xs leading-[16px] text-foreground">
              {prompt}
            </pre>
          </TabsContent>

          <TabsContent value="schema" className="mt-3">
            <div className="flex items-center justify-between gap-3 pb-2">
              <p className="text-xs text-muted-foreground">
                JSON Schema, pour un agent ou une génération contrainte.
              </p>
              <CopyButton text={schema} label="Copier le schéma" />
            </div>
            <pre className="max-h-[46vh] w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-rail p-3 font-mono text-2xs leading-[16px] text-foreground">
              {schema}
            </pre>
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
