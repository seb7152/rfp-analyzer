"use client";

import { useEffect, useState } from "react";
import { Mic, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "@/components/agents/ModelPicker";
import { useAiSettings, useCatalogue, useSaveAiSettings, type AiSettingsInput } from "@/hooks/use-agents";
import { formatDateTime } from "@/lib/format";
import { PageState } from "@/components/shell/PageState";

const PLACEHOLDERS: Array<[string, string]> = [
  ["{{champ}}", "commentaire d'évaluation ou question au fournisseur"],
  ["{{consultation}}", "titre de la consultation"],
  ["{{fournisseurs}}", "noms des fournisseurs de la consultation, celui de la colonne en premier"],
  ["{{vocabulaire}}", "le vocabulaire ci-dessous"],
];

/**
 * Organisation settings of the two helpers of the evaluation workspace:
 * dictation and rewriting of comments and questions. Model and prompt for
 * each, plus the vocabulary both must spell right. Admins edit; others read.
 */
export function AiAssistSettings({ organizationId, canEdit }: { organizationId: string; canEdit: boolean }) {
  const query = useAiSettings(organizationId);
  const catalogue = useCatalogue();
  const save = useSaveAiSettings(organizationId);
  const [form, setForm] = useState<AiSettingsInput | null>(null);

  useEffect(() => {
    if (query.data && !form) {
      const { updated_at: _u, ...rest } = query.data.settings;
      setForm(rest);
    }
  }, [query.data, form]);

  if (query.isLoading || !form) return <PageState kind="loading" title="Chargement des réglages" className="min-h-0 py-10" />;
  if (query.error) {
    return (
      <PageState
        kind="error"
        title="Les réglages n'ont pas pu être chargés"
        description={query.error.message}
        action={<Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>}
        className="min-h-0 py-10"
      />
    );
  }
  const defaults = query.data!.defaults;
  const saved = query.data!.settings;
  const dirty = (Object.keys(form) as Array<keyof AiSettingsInput>).some((k) => form[k] !== saved[k]);
  const disabled = !canEdit || save.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await save.mutateAsync(form);
      const { updated_at: _u, ...rest } = result.settings;
      setForm(rest);
      toast.success("Réglages enregistrés.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Les réglages n'ont pas pu être enregistrés.");
    }
  };

  const models = catalogue.data?.models ?? null;
  const catalogueError = catalogue.error ? catalogue.error.message : null;

  return (
    <form onSubmit={submit} className="panel flex flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Dictée et remise en forme</h2>
          <p className="text-xs text-muted-foreground">
            Les deux boutons des champs Commentaire et Question de l&apos;évaluation. Chaque appel coûte une fraction de centime.
          </p>
        </div>
        <span className="flex-1" />
        {saved.updated_at && <span className="hidden text-xs text-muted-foreground md:inline">Modifié le {formatDateTime(saved.updated_at)}</span>}
        {canEdit && (
          <Button type="submit" size="sm" disabled={disabled || !dirty}>
            {save.isPending ? "Enregistrement" : "Enregistrer"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 px-4 py-4 md:grid-cols-2 md:px-5">
        <Section
          icon={<Mic className="h-4 w-4" />}
          title="Dictée"
          lead="L'enregistrement part au modèle, qui transcrit et nettoie les hésitations."
          modelId={form.transcription_model_id}
          onModel={(id) => setForm({ ...form, transcription_model_id: id })}
          prompt={form.transcription_prompt}
          onPrompt={(p) => setForm({ ...form, transcription_prompt: p })}
          defaultModelId={defaults.transcription_model_id}
          defaultPrompt={defaults.transcription_prompt}
          purpose="audio"
          models={models}
          catalogueError={catalogueError}
          disabled={disabled}
        />
        <Section
          icon={<Sparkles className="h-4 w-4" />}
          title="Remise en forme"
          lead="Le texte saisi est corrigé et clarifié, sans ajout."
          modelId={form.rewrite_model_id}
          onModel={(id) => setForm({ ...form, rewrite_model_id: id })}
          prompt={form.rewrite_prompt}
          onPrompt={(p) => setForm({ ...form, rewrite_prompt: p })}
          defaultModelId={defaults.rewrite_model_id}
          defaultPrompt={defaults.rewrite_prompt}
          purpose="text"
          models={models}
          catalogueError={catalogueError}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-2 md:px-5">
        <div className="space-y-1.5">
          <Label htmlFor="ai-vocabulary">Vocabulaire à respecter</Label>
          <Textarea
            id="ai-vocabulary"
            value={form.vocabulary}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, vocabulary: e.target.value })}
            placeholder="GMAO, Docuware, Visiativ, CCTP, lot 2…"
            className="min-h-[80px] text-sm"
          />
          <p className="text-2xs text-muted-foreground">Sigles, produits, noms propres : transmis aux deux modèles en plus des fournisseurs de la consultation.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Repères disponibles dans les prompts</p>
          <dl className="mt-1 space-y-0.5">
            {PLACEHOLDERS.map(([key, meaning]) => (
              <div key={key} className="flex gap-2">
                <dt className="num shrink-0 text-foreground">{key}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  lead,
  modelId,
  onModel,
  prompt,
  onPrompt,
  defaultModelId,
  defaultPrompt,
  purpose,
  models,
  catalogueError,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  lead: string;
  modelId: string;
  onModel: (id: string) => void;
  prompt: string;
  onPrompt: (p: string) => void;
  defaultModelId: string;
  defaultPrompt: string;
  purpose: "audio" | "text";
  models: Parameters<typeof ModelPicker>[0]["models"];
  catalogueError: string | null;
  disabled: boolean;
}) {
  const isDefault = modelId === defaultModelId && prompt === defaultPrompt;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-background p-3.5">
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{lead}</p>
        </div>
        {!isDefault && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              onModel(defaultModelId);
              onPrompt(defaultPrompt);
            }}
          >
            <RotateCcw className="h-3 w-3" />
            Valeurs par défaut
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Modèle</Label>
        <ModelPicker value={modelId} onChange={onModel} models={models} error={catalogueError} disabled={disabled} purpose={purpose} />
      </div>
      <div className="space-y-1.5">
        <Label>Prompt</Label>
        <Textarea
          aria-label={`Prompt de ${title.toLowerCase()}`}
          value={prompt}
          disabled={disabled}
          onChange={(e) => onPrompt(e.target.value)}
          className="min-h-[220px] font-mono text-[13px] leading-5"
        />
      </div>
    </section>
  );
}
