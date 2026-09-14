"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/** ⌘K: jump to a consultation or one of its chapters. */
export function CommandPalette({ rfps }: { rfps: RFP[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-[260px] items-center gap-2 rounded-md border border-input bg-card px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Rechercher une consultation"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate text-left">Rechercher une consultation</span>
        <kbd className="num rounded-sm border border-border px-1 text-2xs">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Consultation, chapitre" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Consultations">
            {rfps.map((r) => (
              <CommandItem key={r.id} value={r.title} onSelect={() => go(`/dashboard/rfp/${r.id}`)}>
                {r.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Aller à">
            {rfps.slice(0, 5).flatMap((r) =>
              [
                ["Évaluation", "evaluate"],
                ["Décision", "decision"],
                ["Préparation", "preparation"],
              ].map(([label, path]) => (
                <CommandItem key={`${r.id}-${path}`} value={`${r.title} ${label}`} onSelect={() => go(`/dashboard/rfp/${r.id}/${path}`)}>
                  <span className="text-muted-foreground">{r.title} ›</span>&nbsp;{label}
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
