---
version: 1
slug: "app-dashboard-rfp-rfpid-layout-tsx"
primary_target: "app/dashboard/rfp/[rfpId]/layout.tsx"
related_targets: ["app/dashboard/page.tsx","app/dashboard/rfp/[rfpId]/preparation/page.tsx","app/dashboard/rfp/[rfpId]/evaluate/page.tsx","app/dashboard/rfp/[rfpId]/decision/page.tsx"]
---

# Surface brief — RFP Analyzer, parcours refondus

Scope: the RFP shell (`app/dashboard/rfp/[rfpId]/layout.tsx`) and the three redesigned journeys it hosts: preparation hub (`/preparation`), evaluation workspace (`/evaluate`), decision view (`/decision`), plus the merged home (`/dashboard`). Mode: **Operate** on every route; `/decision` leans Read (sponsor consults, does not edit).

Audience and job: Sophie (owner) prepares and pilots a consultation daily for 4–8 weeks on desktop; Marc (evaluator) scores 40 requirements in 2–3 short sessions, often on mobile with unstable network; Claire (viewer) reads the synthesis 2–3 times, sometimes projected in a committee.

Content and proof: real Supabase data only (requirements, suppliers, responses, AI scores, comments, documents, annotations). No synthetic content anywhere.

Constraints: no DB schema, API contract or auth change; no feature removed; offline queue kept on `/evaluate`; LCP < 2 s, interactions < 200 ms, 200 requirements × 10 suppliers fluid; vocabulary: consultation, exigence, domaine, fournisseur, pondération, soutenance, référentiel, livrable; no promotional tone, no exclamation marks.

Build path: code-led (no image generation available in this session); the ambition lives in FIRST VIEWPORT and the signature interaction below.

## Direction contract

THESIS: A consultation is a numbered dossier whose chapters are its phases; the interface is the dossier's table of contents and its articles, never a dashboard of cards and tabs. It refuses the category default (KPI cards, ten tabs, one home for every phase) and its opposite (a raw spreadsheet).

OWN-WORLD: Paper ground (white light / charcoal dark), near-black ink, one institutional ink-blue for the single primary action and current selection; four status "stamps" (conforme, partiel, non conforme, roadmap) each with glyph + label, never colour alone. Separators are 1 px hairlines; radius 2 px; no drop shadows; one family, Source Sans 3, tabular numerals for every figure. Article numbering (1., 1.1, 1.1.3) is the recurring identity: with content removed, the page still reads as a numbered dossier with a left table of contents.

STORY: Sophie opens a consultation and sees where the dossier stands and the one next action; Marc opens his work queue and clears it one stamp at a time, proof one click away; Claire opens the decision view and follows the cross-references from the winner down to the quoted page, then exports.

FIRST VIEWPORT (RFP shell, desktop 1440): a 48 px top bar (wordmark, organisation › consultation breadcrumb, version, theme, user). Below it a 240 px left rail titled by the consultation, listing six numbered chapters (1 Préparation, 2 Référentiel, 3 Analyse IA, 4 Évaluation, 5 Arbitrage, 6 Restitution) plus a separated "Paramètres" entry; each chapter shows its state as a glyph and a short figure ("108 exigences", "3/4 réponses"). The content column (max 1120 px) opens on the chapter matching the dossier's progression: for a fresh consultation, the preparation hub whose first line is the next action in ink-blue with its single primary button at the top right of the content header. An async strip under the top bar appears only while an AI analysis runs: "Analyse IA · 120/648 réponses · ~4 min" with a live count.

FORM: candidate 5 of 7 on the grounded list ("le DCE et l'avis de marché : typographie administrative à articles numérotés"); seed key e0593683, assigned index 5, mode operate. Signature interaction: the cross-reference ("renvoi") — every score is a link; hover shows the cited excerpt, click opens the document at the page; the sponsor breadcrumb is the chain of renvois. Motion grammar: 150 ms colour/border transitions on state change only; no entrance sequences; reduced-motion honoured.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
