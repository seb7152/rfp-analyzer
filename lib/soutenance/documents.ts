/**
 * The chapter's documents as Markdown, for the Word export: the point de
 * synthèse of a version, a séance in full. Pure; usable in the browser.
 */

import type { Overview } from "./api";
import { SERVER_TIME_ZONE, formatSessionDate } from "./dates";
import type { SoutenanceBriefRow, SoutenanceSessionRow, SyntheseDomain } from "./types";

function score(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : v.toFixed(1).replace(".", ",");
}

function delta(v: number | null, mean: number | null): string {
  if (v === null || mean === null) return "";
  const d = v - mean;
  return ` (${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")} vs moyenne)`;
}

export function syntheseTitle(overview: Overview): string {
  return `Point de synthèse — ${overview.rfp.title}`.replace(/[\\/:*?"<>|]+/g, " ").trim();
}

export function syntheseMarkdown(overview: Overview): string {
  const retained = overview.suppliers.filter((s) => !s.removed);
  const removed = overview.suppliers.filter((s) => s.removed);
  const lines: string[] = [];
  lines.push(`# Point de synthèse — ${overview.rfp.title}`);
  lines.push("");
  lines.push(`Version d'évaluation : ${overview.version?.version_name ?? "—"}${overview.synthese?.generated_at ? ` · synthèse générée le ${new Date(overview.synthese.generated_at).toLocaleDateString("fr-FR")}` : ""}`);
  lines.push("");
  lines.push("## Notes par domaine");
  lines.push("");
  lines.push(`| Domaine | ${retained.map((s) => s.name).join(" | ")} | Moyenne |`);
  lines.push(`|---|${retained.map(() => "---:").join("|")}|---:|`);
  for (const row of overview.scores.rows) {
    lines.push(`| ${row.code} — ${row.title} | ${retained.map((s) => score(row.cells[s.id]?.score)).join(" | ")} | ${score(row.mean)} |`);
  }
  lines.push(`| **Ensemble** | ${retained.map((s) => `**${score(overview.scores.overall.find((o) => o.supplierId === s.id)?.score)}**`).join(" | ")} | **${score(overview.scores.overallMean)}** |`);
  lines.push("");
  for (const s of retained) {
    const overall = overview.scores.overall.find((o) => o.supplierId === s.id);
    lines.push(`## ${s.name}`);
    lines.push("");
    lines.push(`Note d'ensemble : ${score(overall?.score)}/5${delta(overall?.score ?? null, overview.scores.overallMean)}${overall?.rank ? ` · ${overall.rank}${overall.rank === 1 ? "er" : "e"} sur ${retained.length}` : ""}`);
    lines.push("");
    const synth = overview.synthese?.data?.suppliers?.[s.id];
    for (const row of overview.scores.rows) {
      const d: SyntheseDomain | undefined = synth?.domains?.[row.id];
      lines.push(`### ${row.code} — ${row.title} · ${score(row.cells[s.id]?.score)}/5${delta(row.cells[s.id]?.score ?? null, row.mean)}`);
      lines.push("");
      const section = (title: string, items: Array<{ code: string; text: string }> | undefined) => {
        lines.push(`**${title}**`);
        lines.push("");
        if (!items || items.length === 0) lines.push("- Aucun point relevé.");
        else for (const i of items) lines.push(`- ${i.code ? `${i.code} — ` : ""}${i.text}`);
        lines.push("");
      };
      section("Forces", d?.forces);
      section("Faiblesses", d?.faiblesses);
      section("Questions à poser", d?.questions);
    }
  }
  if (removed.length > 0) {
    lines.push("## Fournisseurs retirés de la version");
    lines.push("");
    for (const s of removed) lines.push(`- ${s.name}${s.removed?.reason ? ` — « ${s.removed.reason} »` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function sessionTitle(overview: Overview, supplierName: string): string {
  return `Soutenance ${supplierName} — ${overview.rfp.title}`.replace(/[\\/:*?"<>|]+/g, " ").trim();
}

export function sessionMarkdown(input: {
  overview: Overview;
  supplierName: string;
  session: SoutenanceSessionRow | null;
  brief: SoutenanceBriefRow | null;
  findings: Array<{ requirement: { code: string; title: string }; status: string; verdict: string; proposed_score: number; justification: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`# Soutenance ${input.supplierName} — ${input.overview.rfp.title}`);
  lines.push("");
  if (input.session?.scheduled_at) lines.push(`Séance du ${formatSessionDate(input.session.scheduled_at, { long: true, timeZone: SERVER_TIME_ZONE })}`);
  lines.push("");
  if (input.brief?.report_markdown) {
    lines.push("# Brief");
    lines.push("");
    lines.push(input.brief.report_markdown.trim());
    lines.push("");
  }
  if (input.session?.report_markdown) {
    lines.push("# Compte rendu");
    lines.push("");
    lines.push(input.session.report_markdown.trim());
    lines.push("");
  }
  const accepted = input.findings.filter((f) => f.status === "accepted");
  const rejected = input.findings.filter((f) => f.status === "rejected");
  const open = input.findings.filter((f) => f.status === "proposed");
  if (input.findings.length > 0) {
    lines.push("# Évolutions de l'évaluation");
    lines.push("");
    const block = (title: string, items: typeof input.findings) => {
      if (items.length === 0) return;
      lines.push(`## ${title} (${items.length})`);
      lines.push("");
      for (const f of items) lines.push(`- **${f.requirement.code} — ${f.requirement.title}** : ${f.verdict.replace("_", " ")}, note IA ${score(f.proposed_score)}/5. ${f.justification}`);
      lines.push("");
    };
    block("Reprises dans l'évaluation", accepted);
    block("Écartées", rejected);
    block("À décider", open);
  }
  return lines.join("\n");
}
