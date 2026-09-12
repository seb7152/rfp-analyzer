/**
 * The point de synthèse as slides, for the client meeting: the overview
 * table, one slide per retained supplier (domain scores against the mean,
 * forces, points of vigilance, questions), the suppliers removed from the
 * version. Same figures as the chapter.
 */

import PptxGenJS from "pptxgenjs";
import type { Overview } from "./api";

const INK = "161618";
const GREY = "62626B";
const SLATE = "4C73A8";
const RULE = "E3E3E6";
const FONT = "Calibri";

type Cell = { text: string; options: PptxGenJS.TableCellProps };

function score(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : v.toFixed(1).replace(".", ",");
}

function delta(v: number | null, mean: number | null): string {
  if (v === null || mean === null) return "";
  const d = v - mean;
  if (Math.abs(d) < 0.05) return " (= moyenne)";
  return ` (${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")})`;
}

/** The point de synthèse as slides: overview, one per retained supplier, the removed ones. */
export function buildSynthesePptx(overview: Overview): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "RFP Analyzer";
  pptx.title = `Point de synthèse — ${overview.rfp.title}`;
  const retained = overview.suppliers.filter((s) => !s.removed);
  const removed = overview.suppliers.filter((s) => s.removed);

  const title = pptx.addSlide();
  title.addText("Point de synthèse", { x: 0.6, y: 1.6, w: 8.8, h: 0.8, fontFace: FONT, fontSize: 32, bold: true, color: INK });
  title.addText(overview.rfp.title, { x: 0.6, y: 2.4, w: 8.8, h: 0.6, fontFace: FONT, fontSize: 18, color: GREY });
  title.addText(
    `${overview.version?.version_name ?? ""}${overview.synthese?.generated_at ? ` · synthèse du ${new Date(overview.synthese.generated_at).toLocaleDateString("fr-FR")}` : ""} · ${retained.length} fournisseurs retenus`,
    { x: 0.6, y: 3.0, w: 8.8, h: 0.4, fontFace: FONT, fontSize: 12, color: GREY }
  );

  const table = pptx.addSlide();
  table.addText("Notes par domaine", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: INK });
  const head: Cell[] = ["Domaine", ...retained.map((s) => s.name), "Moyenne"].map((t, i) => ({
    text: t,
    options: { bold: true, fontSize: 11, color: GREY, fill: { color: "F6F6F7" }, align: (i === 0 ? "left" : "center") as "left" | "center" },
  }));
  const rows: Cell[][] = overview.scores.rows.map((row) => [
    { text: `${row.code} — ${row.title}`, options: { fontSize: 11, color: INK } },
    ...retained.map((s) => ({ text: score(row.cells[s.id]?.score), options: { fontSize: 12, color: INK, align: "center" as const } })),
    { text: score(row.mean), options: { fontSize: 12, bold: true, color: INK, align: "center" as const } },
  ]);
  rows.push([
    { text: "Ensemble, pondéré", options: { fontSize: 11, bold: true, color: INK } },
    ...retained.map((s) => ({ text: score(overview.scores.overall.find((o) => o.supplierId === s.id)?.score), options: { fontSize: 12, bold: true, color: INK, align: "center" as const } })),
    { text: score(overview.scores.overallMean), options: { fontSize: 12, bold: true, color: INK, align: "center" as const } },
  ]);
  const firstCol = 3.2;
  const other = (9 - firstCol) / (retained.length + 1);
  table.addTable([head, ...rows], { x: 0.5, y: 1.0, w: 9, colW: [firstCol, ...retained.map(() => other), other], fontFace: FONT, border: { type: "solid", pt: 0.5, color: RULE }, rowH: 0.34 });

  for (const s of retained) {
    const slide = pptx.addSlide();
    const overall = overview.scores.overall.find((o) => o.supplierId === s.id);
    slide.addText(s.name, { x: 0.5, y: 0.35, w: 6, h: 0.55, fontFace: FONT, fontSize: 24, bold: true, color: INK });
    slide.addText(`${score(overall?.score)}/5`, { x: 7.0, y: 0.3, w: 2.5, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK, align: "right" });
    slide.addText(`moyenne des retenus ${score(overview.scores.overallMean)}${delta(overall?.score ?? null, overview.scores.overallMean)}${overall?.rank ? ` · ${overall.rank}${overall.rank === 1 ? "er" : "e"} sur ${retained.length}` : ""}`, {
      x: 5.0,
      y: 0.85,
      w: 4.5,
      h: 0.3,
      fontFace: FONT,
      fontSize: 10,
      color: GREY,
      align: "right",
    });
    const domainsLine = overview.scores.rows.map((row) => `${row.code} ${score(row.cells[s.id]?.score)}${delta(row.cells[s.id]?.score ?? null, row.mean)}`).join("   ·   ");
    slide.addText(domainsLine, { x: 0.5, y: 1.15, w: 9, h: 0.35, fontFace: FONT, fontSize: 11, color: SLATE });
    const synth = overview.synthese?.data?.suppliers?.[s.id];
    const columns: Array<[string, "forces" | "faiblesses" | "questions"]> = [
      ["Forces", "forces"],
      ["Points de vigilance", "faiblesses"],
      ["Questions à poser", "questions"],
    ];
    columns.forEach(([label, kind], i) => {
      const x = 0.5 + i * 3.05;
      const items = overview.scores.rows.flatMap((row) => synth?.domains?.[row.id]?.[kind] ?? []).slice(0, 6);
      slide.addText(label, { x, y: 1.65, w: 2.9, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: GREY });
      slide.addText(
        items.length === 0
          ? [{ text: synth ? "Aucun point relevé." : "Synthèse non générée.", options: { color: GREY } }]
          : items.map((it) => ({ text: `${it.code ? `${it.code} — ` : ""}${it.text}`, options: { bullet: true, breakLine: true } })),
        { x, y: 2.0, w: 2.9, h: 3.4, fontFace: FONT, fontSize: 10.5, color: INK, valign: "top", paraSpaceAfter: 4 }
      );
    });
  }

  if (removed.length > 0) {
    const slide = pptx.addSlide();
    slide.addText("Fournisseurs retirés de la version", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: INK });
    slide.addText(
      removed.map((s) => ({ text: `${s.name} — ${score(overview.scores.overall.find((o) => o.supplierId === s.id)?.score)}/5${s.removed?.reason ? ` — « ${s.removed.reason} »` : ""}`, options: { bullet: true, breakLine: true } })),
      { x: 0.5, y: 1.1, w: 9, h: 4, fontFace: FONT, fontSize: 14, color: INK, valign: "top", paraSpaceAfter: 8 }
    );
  }
  return pptx;
}

