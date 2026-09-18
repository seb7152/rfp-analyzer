"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CatalogueModel } from "@/lib/agents/types";
import { formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Below this context length a whole domain may not fit; flagged, not hidden. */
export const MIN_CONTEXT = 200_000;

export function perMillion(pricePerToken: number): string {
  const v = pricePerToken * 1_000_000;
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} $`;
}

/**
 * Model selector fed by the OpenRouter catalogue. The field shows the
 * identifier only, on one line; the list carries the name, the context
 * length, the prices per million tokens and structured-output support.
 * When the catalogue is down the recorded identifier stays and is shown raw.
 */
export type ModelPurpose = "agent" | "audio" | "text";

export function ModelPicker({
  value,
  onChange,
  models,
  error,
  disabled,
  purpose = "agent",
}: {
  value: string;
  onChange: (modelId: string) => void;
  models: CatalogueModel[] | null;
  error: string | null;
  disabled?: boolean;
  /** "agent": whole domains, large context flagged; "audio": models taking audio; "text": any model. */
  purpose?: ModelPurpose;
}) {
  const [open, setOpen] = useState(false);
  const [onlyLarge, setOnlyLarge] = useState(purpose === "agent");
  const contextMatters = purpose === "agent";

  const current = models?.find((m) => m.id === value) ?? null;
  const visible = useMemo(() => {
    const list = (models ?? []).filter((m) => (purpose !== "audio" || m.audio_input) && (!onlyLarge || m.context_length >= MIN_CONTEXT));
    return [...list].sort((a, b) => b.created - a.created);
  }, [models, onlyLarge, purpose]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Choisir le modèle"
            className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left transition-colors duration-150 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <span className={cn("num min-w-0 flex-1 truncate text-sm", !value && "text-muted-foreground")}>{value || "Choisir un modèle"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(560px,90vw)] p-0">
          <Command>
            <CommandInput placeholder="Nom ou fournisseur (anthropic, openai, google…)" />
            <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
              {contextMatters ? (
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={onlyLarge} onChange={(e) => setOnlyLarge(e.target.checked)} className="h-3.5 w-3.5" />
                  Contexte de {formatTokens(MIN_CONTEXT)} tokens au moins
                </label>
              ) : (
                <span>{purpose === "audio" ? "Modèles acceptant l'audio en entrée" : "Tous les modèles du catalogue"}</span>
              )}
              <span className="num ml-auto">{visible.length} modèles</span>
            </div>
            <CommandList className="max-h-72">
              <CommandEmpty>{models ? "Aucun modèle ne correspond." : "Catalogue indisponible."}</CommandEmpty>
              <CommandGroup>
                {visible.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${m.id}`}
                    onSelect={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2"
                  >
                    <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-primary", m.id === value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">
                      <span className="num block truncate text-sm">{m.id}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.name}</span>
                    </span>
                    <span className="num shrink-0 text-right text-xs text-muted-foreground">
                      <span className={cn("block", contextMatters && m.context_length < MIN_CONTEXT && "text-status-partial")}>{formatTokens(m.context_length)} ctx</span>
                      <span className="block">
                        {perMillion(m.prompt_price)} / {perMillion(m.completion_price)} par M
                      </span>
                      <span className="block">{m.structured_outputs ? "sorties structurées" : "texte libre"}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {current ? (
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Contexte</dt>
            <dd className={cn("num font-semibold", contextMatters && current.context_length < MIN_CONTEXT && "text-status-partial")}>{formatTokens(current.context_length)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Prix / M tokens</dt>
            <dd className="num font-semibold">
              {perMillion(current.prompt_price)} · {perMillion(current.completion_price)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sorties</dt>
            <dd className="font-medium">{current.structured_outputs ? "structurées" : "texte libre"}</dd>
          </div>
        </dl>
      ) : error ? (
        <p className="text-xs text-status-partial">{error} Le modèle enregistré est conservé.</p>
      ) : value ? (
        <p className="text-xs text-muted-foreground">Modèle absent du catalogue : conservé tel quel.</p>
      ) : null}
      {contextMatters && current && current.context_length < MIN_CONTEXT && (
        <p className="text-xs text-status-partial">Contexte de {formatTokens(current.context_length)} tokens : un domaine entier peut ne pas tenir.</p>
      )}
    </div>
  );
}
