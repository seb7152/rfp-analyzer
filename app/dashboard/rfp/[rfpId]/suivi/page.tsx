"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { useConsultation } from "@/hooks/use-consultation";
import { useVersion } from "@/contexts/VersionContext";
import { useResponsesLight } from "@/hooks/use-responses-light";
import { useRequirementsTree, type TreeNode } from "@/hooks/use-requirements";
import { formatDateTime } from "@/lib/format";

interface Assignment {
  user_id: string;
  access_level: "owner" | "evaluator" | "viewer";
  user: { id: string; email: string; full_name: string | null } | null;
}

function Bar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-24 overflow-hidden rounded-sm bg-muted" aria-hidden>
        <span className="block h-full bg-primary" style={{ width: `${value}%` }} />
      </span>
      <span className="tnum w-10 text-right text-xs text-muted-foreground">{value} %</span>
    </div>
  );
}

/**
 * Chapter 3, pilot's view: who is late, and on what. Progress per supplier,
 * per domain and per analyst, from the same light read of the responses.
 */
export default function SuiviPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { preparation, isLoading } = useConsultation(rfpId);
  const { activeVersion } = useVersion();
  const responsesQuery = useResponsesLight(rfpId, activeVersion?.id);
  const { tree } = useRequirementsTree(rfpId);
  const assignmentsQuery = useQuery<{ assignments: Assignment[] }>({
    queryKey: ["assignments", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/assignments`);
      if (!res.ok) throw new Error("Les analystes n'ont pas pu être chargés.");
      return res.json();
    },
    staleTime: 60_000,
  });

  const responses = responsesQuery.data?.responses ?? [];

  const domainOf = useMemo(() => {
    const map = new Map<string, { id: string; code: string; title: string }>();
    const walk = (nodes: TreeNode[], domain: { id: string; code: string; title: string } | null) => {
      for (const n of nodes) {
        const d = n.type === "category" && n.level === 1 ? { id: n.id, code: n.code, title: n.title } : domain;
        if (n.type === "requirement" && d) map.set(n.id, d);
        if (n.children) walk(n.children, d);
      }
    };
    walk(tree, null);
    return map;
  }, [tree]);

  const byDomain = useMemo(() => {
    const acc = new Map<string, { code: string; title: string; total: number; checked: number }>();
    for (const r of responses) {
      const d = domainOf.get(r.requirement_id);
      if (!d) continue;
      const e = acc.get(d.id) ?? { code: d.code, title: d.title, total: 0, checked: 0 };
      e.total++;
      if (r.is_checked) e.checked++;
      acc.set(d.id, e);
    }
    return Array.from(acc.values()).sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));
  }, [responses, domainOf]);

  const byAnalyst = useMemo(() => {
    const counts = new Map<string, { checked: number; last: string | null }>();
    for (const r of responses) {
      if (!r.last_modified_by) continue;
      const e = counts.get(r.last_modified_by) ?? { checked: 0, last: null };
      if (r.is_checked) e.checked++;
      if (!e.last || r.updated_at > e.last) e.last = r.updated_at;
      counts.set(r.last_modified_by, e);
    }
    const assignments = assignmentsQuery.data?.assignments ?? [];
    return assignments
      .filter((a) => a.access_level !== "viewer")
      .map((a) => ({
        id: a.user_id,
        name: a.user?.full_name || a.user?.email || "—",
        level: a.access_level,
        checked: counts.get(a.user_id)?.checked ?? 0,
        last: counts.get(a.user_id)?.last ?? null,
      }))
      .sort((a, b) => b.checked - a.checked);
  }, [responses, assignmentsQuery.data]);

  if (isLoading || responsesQuery.isLoading) {
    return <PageState kind="loading" title="Chargement de l'avancement" />;
  }
  if (!preparation) return null;
  if (responsesQuery.error) {
    return (
      <PageState
        kind="error"
        title="L'avancement n'a pas pu être chargé"
        description={responsesQuery.error.message}
        action={<Button variant="outline" onClick={() => responsesQuery.refetch()}>Réessayer</Button>}
      />
    );
  }

  const total = responses.length;
  const checked = responses.filter((r) => r.is_checked).length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  const suppliers = preparation.suppliers.items;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-8">
      <PageHeader
        title="Avancement de l'évaluation"
        lead={
          total === 0
            ? "Aucune réponse à évaluer pour l'instant."
            : `${checked} réponses évaluées sur ${total} (${percent} %).`
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>Ouvrir l'évaluation</Link>
          </Button>
        }
      />

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="suivi-suppliers">
        <h2 id="suivi-suppliers" className="border-b border-border px-4 py-2.5 text-sm font-semibold md:px-5">Par fournisseur</h2>
        <div className="px-4 pb-3 md:px-5">
        <table className="w-full text-sm">
          <tbody>
            {suppliers.map((s) => {
              const pct = s.responsesTotal > 0 ? Math.round((s.responsesAnswered / s.responsesTotal) * 100) : 0;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 pr-3">{s.name}</td>
                  <td className="tnum py-2 pr-3 text-right text-muted-foreground">{s.responsesAnswered}/{s.responsesTotal}</td>
                  <td className="w-40 py-2"><Bar value={pct} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="suivi-domains">
        <h2 id="suivi-domains" className="border-b border-border px-4 py-2.5 text-sm font-semibold md:px-5">Par domaine</h2>
        <div className="px-4 pb-3 md:px-5">
        {byDomain.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun domaine.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {byDomain.map((d) => {
                const pct = d.total > 0 ? Math.round((d.checked / d.total) * 100) : 0;
                return (
                  <tr key={d.code} className="border-t border-border">
                    <td className="py-2 pr-3">
                      <span className="article-no mr-2">{d.code}</span>
                      {d.title}
                    </td>
                    <td className="tnum py-2 pr-3 text-right text-muted-foreground">{d.checked}/{d.total}</td>
                    <td className="w-40 py-2"><Bar value={pct} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        </div>
      </section>

      <section className="panel mx-4 overflow-hidden md:mx-8" aria-labelledby="suivi-analysts">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 md:px-5">
          <h2 id="suivi-analysts" className="text-sm font-semibold">Par analyste</h2>
          <Link href={`/dashboard/rfp/${rfpId}/parametres#analystes`} className="text-xs text-muted-foreground hover:text-foreground">
            Gérer les accès
          </Link>
        </div>
        <div className="px-4 pb-3 md:px-5">
        {byAnalyst.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Aucun analyste assigné.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="py-1 pr-3 font-semibold">Analyste</th>
                <th className="py-1 pr-3 font-semibold">Accès</th>
                <th className="py-1 pr-3 text-right font-semibold">Réponses évaluées</th>
                <th className="py-1 font-semibold">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {byAnalyst.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-2 pr-3">{a.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.level === "owner" ? "Pilote" : "Expert"}</td>
                  <td className="tnum py-2 pr-3 text-right">{a.checked}</td>
                  <td className="py-2 text-muted-foreground">{a.last ? formatDateTime(a.last) : "aucune"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </section>
    </div>
  );
}
