/**
 * The four datasets an import can write, their fields, and the reading of a
 * file before anything is written.
 *
 * The server validators (`lib/supabase/validators.ts`) reject a payload whole:
 * one bad row and nothing is imported. So the reading here marks each row and
 * the workspace sends only the rows it can vouch for. The rules below are the
 * server's rules; when they drift, the import fails on the server and the
 * message is shown as is.
 */

export type DatasetId = "domaines" | "exigences" | "fournisseurs" | "reponses";

export type RowState = "create" | "update" | "skip" | "error";

export interface FieldSpec {
  name: string;
  required: boolean;
  /** Type as written in the prompt and in the field list. */
  type: string;
  description: string;
}

export interface PreviewRow {
  /** Position in the file, 1-based. */
  line: number;
  state: RowState;
  /** Short French sentence: what will happen to this row, or why it cannot. */
  reason: string;
  cells: string[];
  payload?: Record<string, unknown>;
}

export interface Preview {
  rows: PreviewRow[];
  counts: { create: number; update: number; skip: number; error: number; total: number };
  /** Set when the file could not be read at all. */
  fatal?: string;
}

export interface ImportContext {
  /** The consultation an agent has to name in every call. */
  rfpId: string;
  /** Origin of this installation, for the MCP endpoint. */
  origin: string;
  categoryTitles: string[];
  categoryCodes: string[];
  requirementCodes: string[];
  /** External identifiers of the suppliers already declared. */
  supplierIds: string[];
  /** Target supplier, for the responses dataset. */
  supplier?: { externalId: string; name: string };
}

interface DatasetSpec {
  id: DatasetId;
  label: string;
  lead: string;
  columns: string[];
  fields: FieldSpec[];
  /** What the endpoint does with a row whose key already exists. */
  duplicate: "update" | "skip";
  example: unknown;
}

export const DATASETS: Record<DatasetId, DatasetSpec> = {
  domaines: {
    id: "domaines",
    label: "Domaines",
    lead: "L'arborescence du cahier des charges : domaines, sous-domaines, jusqu'à quatre niveaux. Un domaine dont le code existe déjà est mis à jour.",
    columns: ["Code", "Titre", "Niveau", "Parent"],
    duplicate: "update",
    fields: [
      { name: "id", required: true, type: "chaîne", description: "Identifiant interne au fichier, sert à rattacher les enfants" },
      { name: "code", required: true, type: "chaîne", description: "Code affiché, unique dans la consultation" },
      { name: "title", required: true, type: "chaîne", description: "Intitulé du domaine" },
      { name: "short_name", required: true, type: "chaîne", description: "Libellé court, pour les colonnes étroites" },
      { name: "level", required: true, type: "entier de 1 à 4", description: "1 pour un domaine racine" },
      { name: "parent_id", required: false, type: "chaîne ou null", description: "id d'un autre domaine du fichier ; absent au niveau 1, obligatoire au-delà" },
      { name: "order", required: false, type: "entier", description: "Ordre d'affichage, sinon l'ordre du fichier" },
    ],
    example: [
      { id: "EXP", code: "EXP", title: "Exploitation", short_name: "Exploit.", level: 1 },
      { id: "EXP-SUP", code: "EXP.1", title: "Supervision", short_name: "Superv.", level: 2, parent_id: "EXP" },
    ],
  },
  exigences: {
    id: "exigences",
    label: "Exigences",
    lead: "Une ligne par exigence, rattachée à un domaine déjà importé par son code ou son titre. Une exigence dont le code existe déjà est mise à jour.",
    columns: ["Code", "Intitulé", "Domaine", "Caractère"],
    duplicate: "update",
    fields: [
      { name: "code", required: true, type: "chaîne", description: "Code repris du cahier des charges, unique dans la consultation" },
      { name: "title", required: true, type: "chaîne", description: "Intitulé de l'exigence" },
      { name: "description", required: true, type: "chaîne", description: "Texte complet de l'exigence" },
      { name: "category_name", required: true, type: "chaîne", description: "Code ou titre d'un domaine existant" },
      { name: "is_mandatory", required: false, type: "booléen", description: "Exigence obligatoire" },
      { name: "is_optional", required: false, type: "booléen", description: "Exigence facultative" },
      { name: "weight", required: false, type: "nombre de 0 à 1", description: "Poids dans la note, sinon 0" },
      { name: "page_number", required: false, type: "entier positif", description: "Page du document source" },
      { name: "tags", required: false, type: "tableau de chaînes", description: "Étiquettes libres" },
    ],
    example: [
      {
        code: "R-101",
        title: "Supervision des équipements",
        description: "La solution supervise l'état des équipements en temps réel.",
        category_name: "EXP.1",
        is_mandatory: true,
        page_number: 12,
      },
    ],
  },
  fournisseurs: {
    id: "fournisseurs",
    label: "Fournisseurs",
    lead: "Les fournisseurs consultés. Un identifiant déjà déclaré est ignoré : il n'est ni créé ni modifié.",
    columns: ["Identifiant", "Nom", "Contact"],
    duplicate: "skip",
    fields: [
      { name: "id", required: true, type: "chaîne", description: "Identifiant externe, sert à rattacher les réponses" },
      { name: "name", required: true, type: "chaîne", description: "Raison sociale" },
      { name: "contact_name", required: false, type: "chaîne", description: "Interlocuteur" },
      { name: "contact_email", required: false, type: "chaîne", description: "Courriel de l'interlocuteur" },
      { name: "contact_phone", required: false, type: "chaîne", description: "Téléphone" },
    ],
    example: [
      { id: "IZIX", name: "IZIX", contact_name: "Claire Martin", contact_email: "claire.martin@izix.test" },
    ],
  },
  reponses: {
    id: "reponses",
    label: "Réponses",
    lead: "Une réponse par exigence, rattachée par le code de l'exigence. Une réponse déjà déposée est mise à jour, champ par champ.",
    columns: ["Exigence", "Réponse", "Note IA"],
    duplicate: "update",
    fields: [
      { name: "requirement_id_external", required: true, type: "chaîne", description: "Code d'une exigence existante" },
      { name: "response_text", required: false, type: "chaîne", description: "Réponse du fournisseur, telle qu'écrite" },
      { name: "ai_score", required: false, type: "nombre de 0 à 5, par demi-points", description: "Note proposée, si elle vient d'une analyse" },
      { name: "ai_comment", required: false, type: "chaîne", description: "Commentaire d'analyse" },
      { name: "manual_score", required: false, type: "nombre de 0 à 5, par demi-points", description: "Note d'un évaluateur" },
      { name: "manual_comment", required: false, type: "chaîne", description: "Commentaire d'un évaluateur" },
      { name: "question", required: false, type: "chaîne", description: "Question posée au fournisseur" },
      { name: "status", required: false, type: "pending, pass, partial ou fail", description: "Statut, sinon déduit de la note" },
    ],
    example: [
      {
        requirement_id_external: "R-101",
        response_text: "La console supervise les équipements en temps réel.",
      },
    ],
  },
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

function truncate(value: unknown, max = 90): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The rows of the file, whatever wrapper the writer used. */
function extractRows(parsed: unknown, key: string): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const wrapped = (parsed as Record<string, unknown>)[key];
    if (Array.isArray(wrapped)) return wrapped;
  }
  return null;
}

function countRows(rows: PreviewRow[]): Preview["counts"] {
  return {
    create: rows.filter((r) => r.state === "create").length,
    update: rows.filter((r) => r.state === "update").length,
    skip: rows.filter((r) => r.state === "skip").length,
    error: rows.filter((r) => r.state === "error").length,
    total: rows.length,
  };
}

function fatal(message: string): Preview {
  return { rows: [], counts: { create: 0, update: 0, skip: 0, error: 0, total: 0 }, fatal: message };
}

/**
 * Reads a file and says, row by row, what an import would do with it.
 * Nothing is sent: the workspace shows this, then posts the kept payloads.
 */
export function buildPreview(id: DatasetId, raw: string, ctx: ImportContext): Preview {
  const text = raw.trim();
  if (!text) return fatal("Le fichier est vide.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "";
    return fatal(`Ce n'est pas du JSON valide. ${detail}`.trim());
  }

  const wrapperKey = {
    domaines: "categories",
    exigences: "requirements",
    fournisseurs: "suppliers",
    reponses: "responses",
  }[id];

  const rows = extractRows(parsed, wrapperKey);
  if (!rows) {
    return fatal(`Le fichier doit contenir une liste, ou un objet avec la clé « ${wrapperKey} ».`);
  }
  if (rows.length === 0) return fatal("La liste est vide.");

  switch (id) {
    case "domaines":
      return previewDomaines(rows, ctx);
    case "exigences":
      return previewExigences(rows, ctx);
    case "fournisseurs":
      return previewFournisseurs(rows, ctx);
    case "reponses":
      return previewReponses(rows, ctx);
  }
}

function previewDomaines(rows: unknown[], ctx: ImportContext): Preview {
  const existing = new Set(ctx.categoryCodes);
  const idsInFile = new Set(
    rows
      .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>).id : null))
      .filter(isNonEmptyString)
  );

  const out: PreviewRow[] = rows.map((row, i) => {
    const line = i + 1;
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const cells = [
      truncate(r.code, 24),
      truncate(r.title, 60),
      truncate(r.level, 8),
      truncate(r.parent_id, 24),
    ];
    const err = (reason: string): PreviewRow => ({ line, state: "error", reason, cells });

    if (!isNonEmptyString(r.id)) return err("id manquant");
    if (!isNonEmptyString(r.code)) return err("code manquant");
    if (!isNonEmptyString(r.title)) return err("title manquant");
    if (!isNonEmptyString(r.short_name)) return err("short_name manquant");
    if (typeof r.level !== "number" || r.level < 1 || r.level > 4) {
      return err("level doit être un entier de 1 à 4");
    }
    if (r.level === 1 && isNonEmptyString(r.parent_id)) return err("un domaine de niveau 1 n'a pas de parent");
    if (r.level > 1 && !isNonEmptyString(r.parent_id)) return err(`un domaine de niveau ${r.level} doit avoir un parent`);
    if (isNonEmptyString(r.parent_id) && !idsInFile.has(r.parent_id)) {
      return err(`le parent « ${r.parent_id} » n'est pas dans le fichier`);
    }

    const update = existing.has(r.code);
    return {
      line,
      state: update ? "update" : "create",
      reason: update ? "code déjà présent, mis à jour" : "nouveau domaine",
      cells,
      payload: {
        id: r.id,
        code: r.code,
        title: r.title,
        short_name: r.short_name,
        level: r.level,
        ...(isNonEmptyString(r.parent_id) ? { parent_id: r.parent_id } : {}),
        ...(typeof r.order === "number" ? { order: r.order } : {}),
      },
    };
  });

  // A child kept while its parent is refused would break the import: refuse it too.
  const keptIds = new Set(
    out.filter((r) => r.state !== "error").map((r) => String(r.payload?.id ?? ""))
  );
  for (const row of out) {
    const parent = row.payload?.parent_id;
    if (row.state !== "error" && isNonEmptyString(parent) && !keptIds.has(parent)) {
      row.state = "error";
      row.reason = `le domaine parent « ${parent} » est en erreur`;
      delete row.payload;
    }
  }

  return { rows: out, counts: countRows(out) };
}

function previewExigences(rows: unknown[], ctx: ImportContext): Preview {
  const existing = new Set(ctx.requirementCodes);
  const domains = new Set([...ctx.categoryCodes, ...ctx.categoryTitles]);
  const seen = new Set<string>();

  const out: PreviewRow[] = rows.map((row, i) => {
    const line = i + 1;
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const caractere = r.is_mandatory === true ? "obligatoire" : r.is_optional === true ? "facultative" : "—";
    const cells = [
      truncate(r.code, 24),
      truncate(r.title, 70),
      truncate(r.category_name, 30),
      caractere,
    ];
    const err = (reason: string): PreviewRow => ({ line, state: "error", reason, cells });

    if (!isNonEmptyString(r.code)) return err("code manquant");
    if (!isNonEmptyString(r.title)) return err("title manquant");
    if (!isNonEmptyString(r.description)) return err("description manquante");
    if (!isNonEmptyString(r.category_name)) return err("category_name manquant");
    if (!domains.has(r.category_name)) return err(`le domaine « ${r.category_name} » n'existe pas`);
    if (r.weight !== undefined && (typeof r.weight !== "number" || r.weight < 0 || r.weight > 1)) {
      return err("weight doit être un nombre de 0 à 1");
    }
    if (r.page_number !== undefined && (typeof r.page_number !== "number" || r.page_number <= 0)) {
      return err("page_number doit être un entier positif");
    }
    if (r.is_mandatory !== undefined && typeof r.is_mandatory !== "boolean") return err("is_mandatory doit être un booléen");
    if (r.is_optional !== undefined && typeof r.is_optional !== "boolean") return err("is_optional doit être un booléen");
    if (r.tags !== undefined && (!Array.isArray(r.tags) || !r.tags.every((t) => isNonEmptyString(t) && t.trim().length <= 100))) {
      return err("tags doit être une liste d'étiquettes");
    }
    if (seen.has(r.code)) return err("code répété dans le fichier");
    seen.add(r.code);

    const update = existing.has(r.code);
    return {
      line,
      state: update ? "update" : "create",
      reason: update ? "code déjà présent, mise à jour" : "nouvelle exigence",
      cells,
      payload: {
        code: r.code,
        title: r.title,
        description: r.description,
        category_name: r.category_name,
        ...(typeof r.weight === "number" ? { weight: r.weight } : {}),
        ...(typeof r.is_mandatory === "boolean" ? { is_mandatory: r.is_mandatory } : {}),
        ...(typeof r.is_optional === "boolean" ? { is_optional: r.is_optional } : {}),
        ...(typeof r.page_number === "number" ? { page_number: r.page_number } : {}),
        ...(Array.isArray(r.tags) ? { tags: r.tags } : {}),
      },
    };
  });

  return { rows: out, counts: countRows(out) };
}

function previewFournisseurs(rows: unknown[], ctx: ImportContext): Preview {
  const existing = new Set(ctx.supplierIds);
  const seen = new Set<string>();

  const out: PreviewRow[] = rows.map((row, i) => {
    const line = i + 1;
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const contact = [r.contact_name, r.contact_email].filter(isNonEmptyString).join(" · ");
    const cells = [truncate(r.id, 24), truncate(r.name, 60), truncate(contact, 50)];
    const err = (reason: string): PreviewRow => ({ line, state: "error", reason, cells });

    if (!isNonEmptyString(r.id)) return err("id manquant");
    if (!isNonEmptyString(r.name)) return err("name manquant");
    if (existing.has(r.id)) {
      return { line, state: "skip", reason: "déjà déclaré, ignoré", cells };
    }
    if (seen.has(r.id)) return { line, state: "skip", reason: "identifiant répété dans le fichier", cells };
    seen.add(r.id);

    return {
      line,
      state: "create",
      reason: "nouveau fournisseur",
      cells,
      payload: {
        id: r.id,
        name: r.name,
        ...(isNonEmptyString(r.contact_name) ? { contact_name: r.contact_name } : {}),
        ...(isNonEmptyString(r.contact_email) ? { contact_email: r.contact_email } : {}),
        ...(isNonEmptyString(r.contact_phone) ? { contact_phone: r.contact_phone } : {}),
      },
    };
  });

  return { rows: out, counts: countRows(out) };
}

const SCORE_OK = (v: unknown) => typeof v === "number" && v >= 0 && v <= 5 && Math.round(v * 2) === v * 2;
const STATUSES = ["pending", "pass", "partial", "fail"];

function previewReponses(rows: unknown[], ctx: ImportContext): Preview {
  const known = new Set(ctx.requirementCodes);
  const seen = new Set<string>();

  const out: PreviewRow[] = rows.map((row, i) => {
    const line = i + 1;
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const code = isNonEmptyString(r.requirement_id_external)
      ? r.requirement_id_external
      : isNonEmptyString(r.code)
        ? r.code
        : null;
    const cells = [
      truncate(code, 24),
      truncate(r.response_text, 80),
      truncate(r.ai_score ?? r.manual_score, 8),
    ];
    const err = (reason: string): PreviewRow => ({ line, state: "error", reason, cells });

    if (!code) return err("requirement_id_external manquant");
    if (!known.has(code)) return err(`l'exigence « ${code} » n'existe pas`);
    if (r.ai_score !== undefined && !SCORE_OK(r.ai_score)) return err("ai_score doit aller de 0 à 5, par demi-points");
    if (r.manual_score !== undefined && !SCORE_OK(r.manual_score)) return err("manual_score doit aller de 0 à 5, par demi-points");
    if (r.status !== undefined && (typeof r.status !== "string" || !STATUSES.includes(r.status))) {
      return err("status doit être pending, pass, partial ou fail");
    }
    if (seen.has(code)) return err("exigence répétée dans le fichier");
    seen.add(code);

    const content = [r.response_text, r.ai_comment, r.manual_comment, r.question].some(isNonEmptyString);
    const scored = r.ai_score !== undefined || r.manual_score !== undefined || r.status !== undefined;
    if (!content && !scored) {
      return { line, state: "skip", reason: "ligne vide, ignorée", cells };
    }

    return {
      line,
      state: "create",
      reason: "réponse lue",
      cells,
      payload: {
        requirement_id_external: code,
        ...(isNonEmptyString(r.response_text) ? { response_text: r.response_text } : {}),
        ...(typeof r.ai_score === "number" ? { ai_score: r.ai_score } : {}),
        ...(isNonEmptyString(r.ai_comment) ? { ai_comment: r.ai_comment } : {}),
        ...(typeof r.manual_score === "number" ? { manual_score: r.manual_score } : {}),
        ...(isNonEmptyString(r.manual_comment) ? { manual_comment: r.manual_comment } : {}),
        ...(isNonEmptyString(r.question) ? { question: r.question } : {}),
        ...(typeof r.status === "string" ? { status: r.status } : {}),
        ...(typeof r.is_checked === "boolean" ? { is_checked: r.is_checked } : {}),
      },
    };
  });

  return { rows: out, counts: countRows(out) };
}

/** The rows an import will actually send. */
export function keptPayloads(preview: Preview): Record<string, unknown>[] {
  return preview.rows
    .filter((r) => (r.state === "create" || r.state === "update") && r.payload)
    .map((r) => r.payload as Record<string, unknown>);
}

// ---------------------------------------------------------------- le format

/** JSON Schema of one dataset, to hand to whoever writes the file. */
export function buildSchema(id: DatasetId): Record<string, unknown> {
  const spec = DATASETS[id];
  const typeOf = (f: FieldSpec): Record<string, unknown> => {
    if (f.type.startsWith("entier")) return { type: "integer" };
    if (f.type.startsWith("nombre")) return { type: "number", minimum: 0, maximum: f.name.includes("score") ? 5 : 1 };
    if (f.type.startsWith("booléen")) return { type: "boolean" };
    if (f.type.startsWith("tableau")) return { type: "array", items: { type: "string" } };
    if (f.name === "status") return { type: "string", enum: STATUSES };
    if (f.name === "parent_id") return { type: ["string", "null"] };
    return { type: "string" };
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: spec.label,
    type: "array",
    items: {
      type: "object",
      required: spec.fields.filter((f) => f.required).map((f) => f.name),
      additionalProperties: false,
      properties: Object.fromEntries(
        spec.fields.map((f) => [f.name, { ...typeOf(f), description: f.description }])
      ),
    },
  };
}

/**
 * A prompt to paste into an assistant along with a spreadsheet: the schema,
 * the rules the import applies, and the consultation's own vocabulary
 * (existing domains, supplier, requirement codes) so the mapping lands.
 */
export function buildPrompt(id: DatasetId, ctx: ImportContext): string {
  const spec = DATASETS[id];
  const lines: string[] = [];

  lines.push(
    `Tu convertis un tableau en JSON d'import pour un outil d'évaluation d'appels d'offres.`,
    `Jeu de données : ${spec.label.toLowerCase()}.`,
    ``,
    `Méthode : la conversion doit être la plus déterministe possible. Établis d'abord la`,
    `correspondance entre les colonnes du tableau et les champs ci-dessous, puis applique-la à`,
    `toutes les lignes sans exception. Dès que le tableau est long, irrégulier ou réparti sur`,
    `plusieurs feuilles, écris et exécute un script qui le lit et produit le JSON, plutôt que de`,
    `transcrire les lignes une à une : une transcription manuelle dérive d'une ligne à l'autre.`,
    `N'invente aucune valeur : un champ inconnu est omis, jamais deviné. Ne reformule pas les`,
    `textes, reprends-les tels quels.`,
    ``,
    `Sortie : un tableau JSON, un objet par ligne du tableau, sans commentaire ni texte autour,`,
    `sans bloc de code — ou un fichier .json contenant ce tableau.`,
    ``,
    `Champs :`
  );
  for (const f of spec.fields) {
    lines.push(`- ${f.name} (${f.type}, ${f.required ? "requis" : "facultatif"}) : ${f.description}`);
  }

  if (id === "domaines") {
    lines.push(
      ``,
      `Règles : un domaine de niveau 1 n'a pas de parent ; au-delà, parent_id reprend l'id d'un domaine présent dans le même fichier.`
    );
    if (ctx.categoryCodes.length > 0) {
      lines.push(
        `Domaines déjà présents dans la consultation (un code identique met le domaine à jour) : ${ctx.categoryCodes.join(", ")}.`
      );
    }
  }

  if (id === "exigences") {
    lines.push(
      ``,
      `Règle : category_name doit reprendre exactement le code ou le titre d'un domaine existant, ci-dessous. Une exigence rattachée à autre chose est refusée.`
    );
    const domains = ctx.categoryCodes.length
      ? ctx.categoryCodes.map((code, i) => `${code} — ${ctx.categoryTitles[i] ?? ""}`.trim())
      : [];
    if (domains.length > 0) {
      lines.push(``, `Domaines existants :`, ...domains.map((d) => `- ${d}`));
    } else {
      lines.push(`Aucun domaine n'est encore importé : importe les domaines d'abord.`);
    }
  }

  if (id === "fournisseurs") {
    lines.push(
      ``,
      `Règle : id est un identifiant court, stable, en majuscules sans espace ; il servira à rattacher les réponses.`
    );
    if (ctx.supplierIds.length > 0) {
      lines.push(`Identifiants déjà déclarés, à ne pas réutiliser : ${ctx.supplierIds.join(", ")}.`);
    }
  }

  if (id === "reponses") {
    lines.push(
      ``,
      `Règle : requirement_id_external reprend exactement le code d'une exigence existante, ci-dessous. Une ligne sans réponse ni note est ignorée.`,
      ctx.supplier
        ? `Ces réponses sont celles du fournisseur ${ctx.supplier.name} (${ctx.supplier.externalId}) ; n'écris pas le fournisseur dans le JSON, l'outil le rattache.`
        : `Le fournisseur est choisi dans l'outil ; n'écris pas le fournisseur dans le JSON.`
    );
    if (ctx.requirementCodes.length > 0) {
      const codes = ctx.requirementCodes.slice(0, 400);
      lines.push(
        ``,
        `Codes d'exigences existants :`,
        codes.join(", ") + (ctx.requirementCodes.length > codes.length ? ", …" : "")
      );
    }
  }

  lines.push(
    ``,
    `Exemple de sortie attendue :`,
    JSON.stringify(spec.example, null, 2),
    ``,
    `Le tableau à convertir suit.`
  );

  return lines.join("\n");
}

const MCP_TOOL: Record<DatasetId, string> = {
  domaines: "import_structure",
  exigences: "import_requirements",
  fournisseurs: "",
  reponses: "import_supplier_responses",
};

const MCP_IMPORT_TYPE: Record<DatasetId, string> = {
  domaines: "structure",
  exigences: "requirements",
  fournisseurs: "",
  reponses: "supplier_responses",
};

/**
 * The other way in: an agent connected to this installation's MCP endpoint
 * writes the dataset itself. Same rules, but the agent needs the token, the
 * consultation's identity and the name of the tool to call.
 */
export function buildAgentPrompt(id: DatasetId, ctx: ImportContext): string {
  const spec = DATASETS[id];
  const tool = MCP_TOOL[id];
  const lines: string[] = [];

  const local = /localhost|127\.0\.0\.1|\[::1\]/.test(ctx.origin);

  lines.push(
    `Tu importes des données dans RFP Analyzer par son connecteur MCP.`,
    `Jeu de données : ${spec.label.toLowerCase()}.`,
    ``,
    `Connexion :`,
    `- Serveur MCP : ${ctx.origin || "https://<installation>"}/api/mcp`,
    ...(local
      ? [`  (adresse locale à cette machine : un agent qui tourne ailleurs doit viser l'adresse`,
         `  publique de l'installation.)`]
      : []),
    `- En-tête : Authorization: Bearer <jeton>, un jeton personnel qui commence par « rfpa_ ».`,
    `- Si tu n'as pas ce jeton, demande-le à l'utilisateur : il le crée dans Jetons d'accès,`,
    `  dans son compte. Ne l'écris jamais dans un fichier, un message ou un journal.`,
    `- Consultation visée : rfp_id = ${ctx.rfpId}`,
    ``
  );

  if (!tool) {
    lines.push(
      `Le connecteur n'expose pas d'import de fournisseurs : déclare-les dans l'application,`,
      `puis reviens pour les réponses.`
    );
    return lines.join("\n");
  }

  lines.push(
    `Méthode : la conversion doit être la plus déterministe possible. Établis d'abord la`,
    `correspondance entre les colonnes de la source et les champs ci-dessous, puis applique-la à`,
    `toutes les lignes sans exception. Dès que la source est longue ou irrégulière, écris et`,
    `exécute un script qui produit le JSON sur disque, puis appelle get_import_command`,
    `(rfp_id, import_type = "${MCP_IMPORT_TYPE[id]}", file_path) : il rend une commande curl qui`,
    `téléverse le fichier sans que son contenu passe par ton contexte. Pour un petit volume,`,
    `${tool} accepte le tableau en ligne.`,
    `N'invente aucune valeur : un champ inconnu est omis, jamais deviné. Ne reformule pas les`,
    `textes, reprends-les tels quels.`,
    ``,
    `Outil : ${tool}`,
    `- rfp_id : ${ctx.rfpId}`
  );

  if (id === "domaines") {
    lines.push(
      `- categories : le tableau d'objets décrit ci-dessous (ou file_content / file_url).`,
      `- mode : « append » par défaut ; « replace » efface la structure existante, ne l'emploie`,
      `  que si l'utilisateur le demande explicitement.`
    );
  }
  if (id === "exigences") {
    lines.push(
      `- requirements : le tableau d'objets décrit ci-dessous (ou file_content / file_url).`,
      `- mode : « append » par défaut ; « replace » efface les exigences existantes.`
    );
  }
  if (id === "reponses") {
    lines.push(
      ctx.supplier
        ? `- supplier_name : ${ctx.supplier.name}`
        : `- supplier_name : le nom du fournisseur, demandé à l'utilisateur s'il manque.`,
      `- responses : le tableau d'objets décrit ci-dessous (ou file_content / file_url).`,
      `- version_id : à omettre, la version active est prise.`
    );
  }

  lines.push(``, `Champs :`);
  for (const f of spec.fields) {
    const required =
      id === "domaines" && f.name === "short_name"
        ? "facultatif par ce chemin"
        : id === "reponses" && f.name === "response_text"
          ? "requis par ce chemin"
          : f.required
            ? "requis"
            : "facultatif";
    lines.push(`- ${f.name} (${f.type}, ${required}) : ${f.description}`);
  }

  if (id === "exigences") {
    const domains = ctx.categoryCodes.map((code, i) => `${code} — ${ctx.categoryTitles[i] ?? ""}`.trim());
    lines.push(
      ``,
      `Règle : category_name reprend exactement le code ou le titre d'un domaine existant.`,
      ...(domains.length > 0
        ? [`Domaines existants :`, ...domains.map((d) => `- ${d}`)]
        : [`Aucun domaine n'est encore importé : commence par import_structure.`])
    );
  }
  if (id === "reponses" && ctx.requirementCodes.length > 0) {
    const codes = ctx.requirementCodes.slice(0, 400);
    lines.push(
      ``,
      `Règle : requirement_id_external reprend exactement le code d'une exigence existante.`,
      `Codes existants :`,
      codes.join(", ") + (ctx.requirementCodes.length > codes.length ? ", …" : "")
    );
  }

  lines.push(
    ``,
    `Rends compte à la fin : ce qui a été créé, ce qui a été mis à jour, ce qui a été refusé et`,
    `pourquoi. En cas de refus, corrige la source et rejoue, ne contourne pas la règle.`
  );

  return lines.join("\n");
}
