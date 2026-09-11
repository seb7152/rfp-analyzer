"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Eye, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModelPicker } from "@/components/agents/ModelPicker";
import { useCatalogue, useDraftPrompt, useSaveAgent, type AgentInput } from "@/hooks/use-agents";
import { PREAMBLE } from "@/lib/agents/prompt";
import { REASONING_EFFORTS, type Agent, type AgentVersionWithMeta, type ReasoningEffort } from "@/lib/agents/types";
import { formatDateTime, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const REASONING_LABEL: Record<ReasoningEffort, string> = {
  none: "Aucun",
  medium: "Moyen",
  high: "Élevé",
};

/** What changed in a version compared with the one before it. */
function versionSummary(v: AgentVersionWithMeta, previous: AgentVersionWithMeta | undefined): string {
  if (!previous) return "Création";
  const changes: string[] = [];
  if (v.system_prompt !== previous.system_prompt) changes.push("Prompt modifié");
  if (v.model_id !== previous.model_id) changes.push("Modèle changé");
  if (v.reasoning_effort !== previous.reasoning_effort) changes.push("Raisonnement changé");
  return changes.join(", ") || "Sans changement";
}

/**
 * The agent's sheet in two panes: settings on the left (identity, model,
 * reasoning, version history with restore), the system prompt on the right,
 * full height. One primary action in the sticky header.
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
  versions: AgentVersionWithMeta[];
  canEdit: boolean;
  defaultModelId: string;
}) {
  const router = useRouter();
  const catalogue = useCatalogue();
  const save = useSaveAgent(organizationId);
  const draft = useDraftPrompt(organizationId);
  const [form, setForm] = useState<AgentInput>({
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    system_prompt: agent?.system_prompt ?? "",
    model_id: agent?.model_id ?? defaultModelId,
    reasoning_effort: agent?.reasoning_effort ?? "high",
  });
  const [contextOpen, setContextOpen] = useState(false);
  const [proposal, setProposal] = useState<{ prompt: string; cost: number } | null>(null);
  const [reading, setReading] = useState<AgentVersionWithMeta | null>(null);
  const [restoring, setRestoring] = useState<AgentVersionWithMeta | null>(null);

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
  const nextVersion = agent ? agent.current_version + 1 : 1;
  const disabled = !canEdit || save.isPending;
  const promptChars = form.system_prompt.length;
  const canDraft = canEdit && !save.isPending && !draft.isPending && form.description.trim().length > 0;

  /** Asks a model for a draft; the proposal is shown before anything replaces the prompt. */
  const generate = async () => {
    try {
      const result = await draft.mutateAsync({ name: form.name, description: form.description, currentPrompt: form.system_prompt });
      setProposal({ prompt: result.prompt, cost: result.cost });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La proposition n'a pas pu être générée.");
    }
  };

  // Oldest first, to describe each version against the previous one.
  const ordered = useMemo(() => [...versions].sort((a, b) => a.version_number - b.version_number), [versions]);
  const summaryOf = useMemo(() => {
    const map = new Map<string, string>();
    ordered.forEach((v, i) => map.set(v.id, versionSummary(v, ordered[i - 1])));
    return map;
  }, [ordered]);

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

  /** Restoring never rewrites history: it creates a new version with the old content. */
  const restore = async (v: AgentVersionWithMeta) => {
    if (!agent) return;
    setRestoring(null);
    try {
      const result = await save.mutateAsync({
        agentId: agent.id,
        input: { system_prompt: v.system_prompt, model_id: v.model_id, reasoning_effort: v.reasoning_effort },
      });
      toast.success(result.versioned ? `Version ${v.version_number} restaurée en version ${result.agent.current_version}.` : "La version courante a déjà ce contenu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La version n'a pas pu être restaurée.");
    }
  };

  return (
    <form onSubmit={submit} className="flex min-h-screen flex-col">
      {/* En-tête collant : fil, identité, une action */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-none md:px-8">
        <Link href="/dashboard/agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Agents
        </Link>
        <span className="text-input">/</span>
        <h1 className="truncate text-base font-semibold leading-[22px]">{agent ? agent.name : "Nouvel agent"}</h1>
        {agent && <span className="num text-xs text-muted-foreground">v{agent.current_version}</span>}
        {agent && <span className={cn("stamp", agent.archived_at ? "stamp-pending" : "stamp-pass")}>{agent.archived_at ? "Archivé" : "Actif"}</span>}
        <span className="flex-1" />
        {agent && <span className="hidden text-xs text-muted-foreground md:inline">Modifié le {formatDateTime(agent.updated_at)}</span>}
        {canEdit && agent && (
          <Button type="button" variant="outline" size="sm" onClick={toggleArchive} disabled={save.isPending}>
            {agent.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {agent.archived_at ? "Réactiver" : "Archiver"}
          </Button>
        )}
        {canEdit && (
          <Button type="submit" size="sm" disabled={disabled || !dirty}>
            {save.isPending ? "Enregistrement" : !agent ? "Créer l'agent" : willVersion ? `Enregistrer la version ${nextVersion}` : "Enregistrer"}
          </Button>
        )}
      </header>

      <div className="grid flex-1 gap-4 px-4 pb-6 pt-4 md:grid-cols-[360px_minmax(0,1fr)] md:px-8">
        {/* Volet réglages */}
        <div className="flex min-w-0 flex-col gap-3">
          <section className="panel flex flex-col gap-3 px-4 py-4 md:px-5">
            <h2 className="text-base font-semibold">Identité</h2>
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Nom</Label>
              <Input id="agent-name" value={form.name} disabled={disabled} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sécurité" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-description">Description courte</Label>
              <Textarea
                id="agent-description"
                value={form.description}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Relit les engagements de sécurité et de conformité"
                className="min-h-[60px] text-sm"
              />
              <p className="text-2xs text-muted-foreground">Visible des évaluateurs sur chaque proposition.</p>
            </div>
          </section>

          <section className="panel flex flex-col gap-3 px-4 py-4 md:px-5">
            <h2 className="text-base font-semibold">Modèle</h2>
            <ModelPicker
              value={form.model_id}
              onChange={(model_id) => setForm({ ...form, model_id })}
              models={catalogue.data?.models ?? null}
              error={catalogue.error ? catalogue.error.message : null}
              disabled={disabled}
            />
            <div className="flex items-center justify-between gap-3">
              <Label>Raisonnement</Label>
              <div role="radiogroup" aria-label="Niveau de raisonnement" className="inline-flex rounded-md border border-input bg-background p-0.5">
                {REASONING_EFFORTS.map((level) => {
                  const on = form.reasoning_effort === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => setForm({ ...form, reasoning_effort: level })}
                      className={cn(
                        "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                        on ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {REASONING_LABEL[level]}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-2xs text-muted-foreground">Transmis par le paramètre de raisonnement d&apos;OpenRouter ; ignoré sans erreur par les modèles qui ne raisonnent pas.</p>
          </section>

          {agent && (
            <section className="panel flex min-h-0 flex-col overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
                <h2 className="text-base font-semibold">Versions</h2>
                <span className="text-xs text-muted-foreground">Restaurer crée une version</span>
              </div>
              {versions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune version enregistrée.</p>
              ) : (
                <ol className="flex flex-col px-3 py-2 md:px-4">
                  {versions.map((v) => {
                    const current = v.version_number === agent.current_version;
                    return (
                      <li
                        key={v.id}
                        className="group grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-2.5 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-accent/50"
                      >
                        <span
                          aria-hidden
                          className={cn("mt-[5px] h-2 w-2 rounded-full", current ? "bg-primary" : "border-[1.5px] border-input")}
                        />
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="num font-semibold">v{v.version_number}</span>
                            {current && <span className="text-muted-foreground"> · courante</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={`${v.model_id} · ${REASONING_LABEL[v.reasoning_effort]}`}>
                            {summaryOf.get(v.id)}
                            {v.runs > 0 ? ` · ${v.runs} analyse${v.runs > 1 ? "s" : ""}` : ""}
                          </p>
                          <p className="truncate text-2xs text-muted-foreground">
                            {formatDateTime(v.created_at)}
                            {v.author_name ? ` · ${v.author_name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-70 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          <Button type="button" variant="ghost" size="xs" onClick={() => setReading(v)}>
                            <Eye className="h-3 w-3" />
                            Lire
                          </Button>
                          {canEdit && !current && (
                            <Button type="button" variant="ghost" size="xs" disabled={save.isPending} onClick={() => setRestoring(v)}>
                              <RotateCcw className="h-3 w-3" />
                              Restaurer
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
        </div>

        {/* Volet prompt */}
        <section className="panel flex min-h-[520px] min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 md:px-5">
            <h2 className="whitespace-nowrap text-base font-semibold">Prompt système</h2>
            <span className="flex-1" />
            <span className="num whitespace-nowrap text-xs text-muted-foreground">
              {promptChars.toLocaleString("fr-FR")} caractères · ~{Math.ceil(promptChars / 4).toLocaleString("fr-FR")} tokens
            </span>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generate}
                disabled={!canDraft}
                title={form.description.trim() ? undefined : "Renseignez d'abord la description courte."}
              >
                <Sparkles className="h-4 w-4" />
                {draft.isPending ? "Rédaction…" : form.system_prompt.trim() ? "Réécrire avec l'IA" : "Proposer avec l'IA"}
              </Button>
            )}
          </div>
          <Textarea
            aria-label="Prompt système"
            value={form.system_prompt}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Tu es expert en sécurité des systèmes d'information. Tu relis…"
            className="min-h-[420px] flex-1 resize-none rounded-none border-0 bg-card px-4 py-4 font-mono text-[13px] leading-5 focus-visible:ring-0 md:px-5"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-rail px-4 py-2.5 text-xs text-muted-foreground md:px-5">
            <span>Ce texte suit un préambule fixe (échelle 0–5, format de sortie, citation verbatim) ; il le précise sans le contredire.</span>
            <button
              type="button"
              onClick={() => setContextOpen(true)}
              className="ml-auto text-accent-foreground hover:underline underline-offset-2"
            >
              Voir le contexte complet envoyé à l&apos;agent
            </button>
          </div>
        </section>
      </div>

      {/* Contexte complet */}
      <Dialog open={contextOpen} onOpenChange={setContextOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ce que l&apos;agent reçoit</DialogTitle>
            <DialogDescription>Dans cet ordre, à chaque lot d&apos;exigences.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li>
              <p className="font-medium">1. Préambule fixe</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">{PREAMBLE}</pre>
            </li>
            <li>
              <p className="font-medium">2. Consignes de l&apos;organisation</p>
              <p className="text-muted-foreground">Le prompt système de cette fiche.</p>
            </li>
            <li>
              <p className="font-medium">3. Exigences du domaine</p>
              <p className="text-muted-foreground">Code, titre, description et contexte de chaque exigence du domaine affecté, avec ses sous-domaines.</p>
            </li>
            <li>
              <p className="font-medium">4. Réponses du fournisseur</p>
              <p className="text-muted-foreground">Le texte de sa réponse à chaque exigence du domaine, « (aucune réponse) » sinon.</p>
            </li>
            <li>
              <p className="font-medium">5. Exigences à évaluer</p>
              <p className="text-muted-foreground">Les codes du lot courant, 12 exigences au plus, seules à recevoir une proposition.</p>
            </li>
          </ol>
        </DialogContent>
      </Dialog>

      {/* Proposition de prompt */}
      <Dialog open={!!proposal} onOpenChange={(o) => !o && setProposal(null)}>
        <DialogContent className="max-w-2xl">
          {proposal && (
            <>
              <DialogHeader>
                <DialogTitle>Proposition de prompt</DialogTitle>
                <DialogDescription>
                  Rédigée à partir du nom et de la description courte{form.system_prompt.trim() ? " et du prompt actuel" : ""}. Rien n&apos;est enregistré tant que vous n&apos;enregistrez pas la fiche.
                  {proposal.cost > 0 ? ` Coût : ${formatUsd(proposal.cost, 3)}.` : ""}
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label="Proposition de prompt"
                value={proposal.prompt}
                onChange={(e) => setProposal({ ...proposal, prompt: e.target.value })}
                className="max-h-[60vh] min-h-[320px] font-mono text-[13px] leading-5"
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={generate} disabled={draft.isPending}>
                  <Sparkles className="h-4 w-4" />
                  {draft.isPending ? "Rédaction…" : "Une autre proposition"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setProposal(null)}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, system_prompt: proposal.prompt });
                    setProposal(null);
                  }}
                >
                  {form.system_prompt.trim() ? "Remplacer le prompt" : "Utiliser cette proposition"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lire une version */}
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-w-2xl">
          {reading && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Version {reading.version_number}
                  {reading.version_number === agent?.current_version ? " · courante" : ""}
                </DialogTitle>
                <DialogDescription>
                  <span className="num">{reading.model_id}</span> · {REASONING_LABEL[reading.reasoning_effort]} · {formatDateTime(reading.created_at)}
                  {reading.author_name ? ` · ${reading.author_name}` : ""}
                </DialogDescription>
              </DialogHeader>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-[13px] leading-5">{reading.system_prompt}</pre>
              {canEdit && reading.version_number !== agent?.current_version && (
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const v = reading;
                      setReading(null);
                      setRestoring(v);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurer
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Restaurer une version */}
      <Dialog open={!!restoring} onOpenChange={(o) => !o && setRestoring(null)}>
        <DialogContent>
          {restoring && (
            <>
              <DialogHeader>
                <DialogTitle>Restaurer la version {restoring.version_number}</DialogTitle>
                <DialogDescription>
                  Le prompt, le modèle et le niveau de raisonnement de la version {restoring.version_number} deviennent la version {nextVersion}. Les versions existantes ne changent pas ; les analyses déjà faites gardent la leur.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRestoring(null)}>
                  Annuler
                </Button>
                <Button type="button" onClick={() => restore(restoring)} disabled={save.isPending}>
                  Restaurer en version {nextVersion}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}
