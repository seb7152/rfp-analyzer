"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FindingCard } from "@/components/agents/FindingCard";
import { useSoutenanceMutations, type SessionDetail, type SessionFinding } from "@/hooks/use-soutenances";
import { StepPanel } from "./DocPanel";

/**
 * What the séance changes in the evaluation: one proposal per requirement
 * concerned, grouped by domain, in the agents' proposal card. Reprendre
 * writes the AI fields of the target version and sends the requirement back
 * to its evaluator; the manual score is never touched.
 */
export function ProposalsPanel({ rfpId, detail, canDecide, onQuote }: { rfpId: string; detail: SessionDetail; canDecide: boolean; onQuote: (at: string | null) => void }) {
  const { decide, acceptAll } = useSoutenanceMutations(rfpId);
  const mine = detail.overview.sessions.find((s) => s.supplier.id === detail.supplier.id);
  const analysis = mine?.analysis;
  const running = analysis?.status === "pending" || analysis?.status === "running";
  const findings = detail.findings;
  const proposed = findings.filter((f) => f.status === "proposed").length;
  const accepted = findings.filter((f) => f.status === "accepted").length;
  const rejected = findings.filter((f) => f.status === "rejected").length;
  const [confirm, setConfirm] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const target = detail.overview.targetVersion;

  const groups = useMemo(() => {
    const map = new Map<string, { code: string; title: string; items: SessionFinding[] }>();
    for (const f of findings) {
      const key = f.requirement.domain_id ?? "none";
      const g = map.get(key) ?? { code: f.requirement.domain_code, title: f.requirement.domain_title, items: [] };
      g.items.push(f);
      map.set(key, g);
    }
    const order = new Map(detail.overview.domains.map((d, i) => [d.id, i]));
    return Array.from(map.entries())
      .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
      .map(([, g]) => ({ ...g, items: g.items.sort((a, b) => a.requirement.code.localeCompare(b.requirement.code, "fr", { numeric: true })) }));
  }, [findings, detail.overview.domains]);

  const act = async (f: SessionFinding, action: "accept" | "reject", reason?: string) => {
    setPendingId(f.id);
    try {
      await decide.mutateAsync({ supplierId: detail.supplier.id, findingId: f.id, action, reason });
      toast.success(action === "accept" ? `${f.requirement.code} reprise dans ${target ? `V${target.version_number}` : "la version active"}.` : `${f.requirement.code} écartée.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La décision n'a pas été enregistrée.");
    } finally {
      setPendingId(null);
    }
  };

  const all = async () => {
    setConfirm(false);
    try {
      const r = await acceptAll.mutateAsync({ supplierId: detail.supplier.id });
      toast.success(`${r.accepted} proposition${r.accepted > 1 ? "s" : ""} reprise${r.accepted > 1 ? "s" : ""}${r.failed > 0 ? `, ${r.failed} en échec` : ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Les propositions n'ont pas pu être reprises.");
    }
  };

  const state = running
    ? `Propositions en cours de production${analysis?.runs ? ` · ${analysis.runs} domaine${analysis.runs > 1 ? "s" : ""}` : ""}`
    : findings.length > 0
      ? `${findings.length} proposition${findings.length > 1 ? "s" : ""} · ${accepted} reprise${accepted > 1 ? "s" : ""} · ${rejected} écartée${rejected > 1 ? "s" : ""} · ${proposed} à décider · vers ${target ? `V${target.version_number} · ${target.version_name}` : "la version active"}`
      : analysis?.status === "failed"
        ? `Échec : ${analysis.error ?? "analyse interrompue"}`
        : detail.session?.report_markdown
          ? "Le compte rendu n'a relevé aucune exigence dont l'évaluation change."
          : "Ce que la séance change, exigence par exigence, à reprendre ou à écarter.";

  return (
    <StepPanel
      id="propositions"
      title="Propositions"
      dot={findings.length > 0 && proposed === 0 ? "done" : findings.length > 0 || running ? "now" : "todo"}
      state={state}
      actions={
        canDecide && proposed > 1 ? (
          <Button type="button" variant="outline" size="sm" disabled={acceptAll.isPending} onClick={() => setConfirm(true)}>
            {acceptAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Tout reprendre
          </Button>
        ) : undefined
      }
    >
      {findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{running ? "Les propositions arrivent, domaine par domaine ; la page se rafraîchit seule." : "Aucune proposition pour cette séance."}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <div key={g.code} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">
                <span className="article-no">{g.code}</span>
                <span>{g.title}</span>
                <span className="num">{g.items.length}</span>
              </div>
              {g.items.map((f) => (
                <div key={f.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2 px-0.5">
                    <span className="article-no">{f.requirement.code}</span>
                    <span className="truncate text-sm font-semibold">{f.requirement.title}</span>
                  </div>
                  <FindingCard
                    finding={f}
                    currentAiScore={null}
                    canDecide={canDecide}
                    disabledReason={!canDecide ? "Réservé aux évaluateurs et pilotes" : null}
                    activeQuote={null}
                    onQuote={(q) => {
                      const ev = f.evidence.find((e) => e.type === "transcript" && e.text === q) as { at: string | null } | undefined;
                      onQuote(ev?.at ?? null);
                    }}
                    onAccept={() => act(f, "accept")}
                    onReject={(reason) => act(f, "reject", reason)}
                    pending={pendingId === f.id || acceptAll.isPending}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprendre les {proposed} propositions ?</AlertDialogTitle>
            <AlertDialogDescription>
              Chacune écrit la note IA, le commentaire IA et la question IA de la réponse dans {target ? `V${target.version_number} · ${target.version_name}` : "la version active"}, et remet l&apos;exigence à revoir dans la file de l&apos;évaluateur. Les notes manuelles ne changent pas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={all}>Tout reprendre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StepPanel>
  );
}
