"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelPicker } from "@/components/agents/ModelPicker";
import { useCatalogue, useSaveAgent, type AgentInput } from "@/hooks/use-agents";
import { PREAMBLE } from "@/lib/agents/prompt";
import type { Agent, AgentVersion, ReasoningEffort } from "@/lib/agents/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const REASONING_LABEL: Record<ReasoningEffort, string> = {
  none: "Aucun",
  medium: "Moyen",
  high: "Élevé",
};

/**
 * The agent's sheet: identity, model from the catalogue, reasoning level,
 * system prompt with a preview of what the agent receives, version history.
 */
export function AgentForm({
  organizationId,
  agent,
  versions,
  canEdit,
  defaultModelId,
}: {
  organizationId: string;
  agent: Agent | null;
  versions: AgentVersion[];
  canEdit: boolean;
  defaultModelId: string;
}) {
  const router = useRouter();
  const catalogue = useCatalogue();
  const save = useSaveAgent(organizationId);
  const [form, setForm] = useState<AgentInput>({
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    system_prompt: agent?.system_prompt ?? "",
    model_id: agent?.model_id ?? defaultModelId,
    reasoning_effort: agent?.reasoning_effort ?? "high",
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    setForm({
      name: agent.name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model_id: agent.model_id,
      reasoning_effort: agent.reasoning_effort,
    });
  }, [agent]);

  const dirty =
    !agent ||
    form.name !== agent.name ||
    form.description !== agent.description ||
    form.system_prompt !== agent.system_prompt ||
    form.model_id !== agent.model_id ||
    form.reasoning_effort !== agent.reasoning_effort;
  const willVersion =
    !!agent &&
    (form.system_prompt !== agent.system_prompt || form.model_id !== agent.model_id || form.reasoning_effort !== agent.reasoning_effort);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.system_prompt.trim()) {
      toast.error("Le nom et le prompt système sont requis.");
      return;
    }
    try {
      const result = await save.mutateAsync({ agentId: agent?.id ?? null, input: form });
      toast.success(agent ? (result.versioned ? `Version ${result.agent.current_version} enregistrée.` : "Agent enregistré.") : "Agent créé.");
      if (!agent) router.replace(`/dashboard/agents/${result.agent.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'agent n'a pas pu être enregistré.");
    }
  };

  const toggleArchive = async () => {
    if (!agent) return;
    try {
      await save.mutateAsync({ agentId: agent.id, input: { archived: !agent.archived_at } });
      toast.success(agent.archived_at ? "Agent réactivé." : "Agent archivé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'agent n'a pas pu être archivé.");
    }
  };

  const disabled = !canEdit || save.isPending;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className="panel px-4 py-4 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Identité</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Nom</Label>
            <Input id="agent-name" value={form.name} disabled={disabled} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sécurité" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-description">Description courte</Label>
            <Input
              id="agent-description"
              value={form.description}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Relit les engagements de sécurité et de conformité"
            />
            <p className="text-xs text-muted-foreground">Visible des évaluateurs sur chaque proposition.</p>
          </div>
        </div>
      </section>

      <section className="panel px-4 py-4 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Modèle et raisonnement</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div className="space-y-1.5">
            <Label>Modèle OpenRouter</Label>
            <ModelPicker
              value={form.model_id}
              onChange={(model_id) => setForm({ ...form, model_id })}
              models={catalogue.data?.models ?? null}
              error={catalogue.error ? catalogue.error.message : null}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Niveau de raisonnement</Label>
            <Select value={form.reasoning_effort} disabled={disabled} onValueChange={(v) => setForm({ ...form, reasoning_effort: v as ReasoningEffort })}>
              <SelectTrigger aria-label="Niveau de raisonnement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASONING_LABEL) as ReasoningEffort[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {REASONING_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Ignoré sans erreur par les modèles qui ne raisonnent pas.</p>
          </div>
        </div>
      </section>

      <section className="panel px-4 py-4 md:px-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Prompt système</h2>
          {agent && <span className="num text-xs text-muted-foreground">version {agent.current_version}</span>}
        </div>
        <Textarea
          aria-label="Prompt système"
          value={form.system_prompt}
          disabled={disabled}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          placeholder="Tu es expert en sécurité des systèmes d'information. Tu relis…"
          className="min-h-[240px] font-mono text-[13px] leading-[19px]"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ce texte suit un préambule fixe qui impose l&apos;échelle 0–5, le format de sortie et la citation verbatim ; il le précise sans le contredire.
          {willVersion && " Enregistrer créera une nouvelle version."}
        </p>
        <button
          type="button"
          onClick={() => setPreviewOpen((o) => !o)}
          aria-expanded={previewOpen}
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent-foreground hover:underline underline-offset-2"
        >
          {previewOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Ce que l&apos;agent recevra
        </button>
        {previewOpen && (
          <ol className="mt-2 space-y-2 rounded-md border border-border bg-background p-3 text-xs">
            <li>
              <span className="font-medium">1. Préambule fixe</span>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">{PREAMBLE}</pre>
            </li>
            <li>
              <span className="font-medium">2. Consignes de l&apos;organisation</span>
              <span className="text-muted-foreground"> : le prompt ci-dessus.</span>
            </li>
            <li>
              <span className="font-medium">3. Exigences du domaine</span>
              <span className="text-muted-foreground"> : code, titre, description et contexte de chaque exigence du sous-arbre affecté, avec ses sous-domaines.</span>
            </li>
            <li>
              <span className="font-medium">4. Réponses du fournisseur</span>
              <span className="text-muted-foreground"> : le texte de sa réponse à chaque exigence du domaine, « (aucune réponse) » sinon.</span>
            </li>
            <li>
              <span className="font-medium">5. Exigences à évaluer</span>
              <span className="text-muted-foreground"> : les codes du lot courant (12 exigences au plus), seuls à recevoir une proposition.</span>
            </li>
          </ol>
        )}
      </section>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={disabled || !dirty}>
            {save.isPending ? "Enregistrement" : agent ? "Enregistrer" : "Créer l'agent"}
          </Button>
          {agent && (
            <Button type="button" variant="outline" onClick={toggleArchive} disabled={save.isPending}>
              {agent.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {agent.archived_at ? "Réactiver" : "Archiver"}
            </Button>
          )}
          {agent?.archived_at && <span className="text-xs text-muted-foreground">Archivé le {formatDateTime(agent.archived_at)} : plus proposé aux consultations.</span>}
        </div>
      )}

      {agent && (
        <section className="panel overflow-hidden">
          <h2 className="border-b border-border px-4 py-2.5 text-base font-semibold md:px-5">Historique des versions</h2>
          {versions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune version enregistrée.</p>
          ) : (
            <ul>
              {versions.map((v) => {
                const open = openVersion === v.id;
                return (
                  <li key={v.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenVersion(open ? null : v.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/40 md:px-5"
                    >
                      {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="num w-8 text-xs text-muted-foreground">v{v.version_number}</span>
                      <span className={cn("flex-1 truncate", v.version_number === agent.current_version && "font-medium")}>
                        {v.version_number === agent.current_version ? "Version courante" : "Version antérieure"}
                      </span>
                      <span className="num truncate text-xs text-muted-foreground">{v.model_id}</span>
                      <span className="text-xs text-muted-foreground">{REASONING_LABEL[v.reasoning_effort]}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</span>
                    </button>
                    {open && (
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-border bg-background px-4 py-3 text-xs md:px-5">{v.system_prompt}</pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}
