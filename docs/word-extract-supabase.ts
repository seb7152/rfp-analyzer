// deno-lint-ignore-file no-explicit-any
import JSZip from "https://esm.sh/jszip@3.10.1";

/**
 * Configuration pour l'extraction des requirements (exigences)
 *
 * @example Cas simple
 * {
 *   "capturePattern": "Exigence\\s*n°\\s*([a-zA-Z0-9]+)",
 *   "codeTemplate": "REQ-$1:padStart(2,0)"
 * }
 *
 * @example Avec titre et contenu (inline)
 * {
 *   "capturePattern": "Exigence\\s*n°\\s*([a-zA-Z0-9]+)",
 *   "codeTemplate": "REQ-$1:padStart(2,0)",
 *   "titleExtraction": {
 *     "type": "inline",
 *     "pattern": "Exigence\\s*n°\\s*[a-zA-Z0-9]+\\s*[-:]\\s*([^\\n:]+?)\\s*[-:]",
 *     "groupIndex": 1
 *   },
 *   "contentExtraction": {
 *     "type": "inline",
 *     "pattern": "Exigence\\s*n°\\s*[a-zA-Z0-9]+(?:\\s*[-:]\\s*[^\\n:]+?)?\\s*[-:]\\s*(.+?)$",
 *     "groupIndex": 1
 *   }
 * }
 *
 * @example Avec titre et contenu (table)
 * {
 *   "capturePattern": "Exigence\\s*n°\\s*([a-zA-Z0-9]+)",
 *   "codeTemplate": "REQ-$1:padStart(2,0)",
 *   "titleExtraction": {
 *     "type": "table",
 *     "columnIndex": 0
 *   },
 *   "contentExtraction": {
 *     "type": "table",
 *     "columnIndex": 2
 *   }
 * }
 *
 * Transformations supportées dans codeTemplate:
 *
 * - padStart(length, fillString)
 *   Remplit avec des caractères au début
 *   Exemples: "$1:padStart(2,0)" → "1" devient "01"
 *
 * - toUpperCase(), toLowerCase()
 * - replace(pattern, replacement)
 * - Transformations chaînables: "$1:padStart(2,0):toUpperCase()"
 */
interface ExtractionConfig {
  type: "inline" | "table";
  pattern?: string; // Pour type: inline - regex avec groupes de capture
  groupIndex?: number; // Pour type: inline - index du groupe (défaut: 1)
  columnIndex?: number; // Pour type: table - index de la colonne
}

interface RequirementConfig {
  capturePattern?: string; // Regex string avec au moins un groupe de capture
  codeTemplate?: string; // Template avec $1, $2, etc. et transformations
  captureGroupIndex?: number; // Index du groupe à utiliser (défaut: 1)
  titleExtraction?: ExtractionConfig; // Optionnel: extraction du titre
  contentExtraction?: ExtractionConfig; // Optionnel: extraction du contenu
}

interface Section {
  level: number;
  title: string;
  content: string[];
  tables: string[][];
  requirements: Array<{
    code: string;
    originalCapture: string;
    title?: string;
    content?: string;
  }>;
}

// Build style map from styles.xml
async function buildStyleMap(zip: any): Promise<Map<string, number>> {
  const styleMap = new Map<string, number>();
  const stylesFile = zip.file("word/styles.xml");

  if (!stylesFile) return styleMap;

  const stylesXml = await stylesFile.async("string");

  // Match all style definitions with heading patterns
  const stylePattern =
    /<w:style[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g;
  let match;

  while ((match = stylePattern.exec(stylesXml)) !== null) {
    const styleId = match[1];
    const styleContent = match[2];

    // Look for name element
    const nameMatch = styleContent.match(/<w:name[^>]*w:val="([^"]+)"/);
    if (!nameMatch) continue;

    const styleName = nameMatch[1];

    // Detect heading level from style name (works with Heading, Titre, Heading1, etc.)
    const levelMatch = styleName.match(
      /(?:Heading|Titre)[\s-]*(\d+)|^[A-Z](?:Caption|Subtitle)/i
    );
    if (levelMatch) {
      const level = levelMatch[1]
        ? parseInt(levelMatch[1])
        : styleName.includes("Caption")
          ? 2
          : 2;
      styleMap.set(styleId, level);
    }

    // Also handle "Title" style
    if (styleName === "Title" || styleName === "Titre") {
      styleMap.set(styleId, 1);
    }
  }

  return styleMap;
}

function extractText(xml: string): string {
  const matches = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches
    .map((x) => x[1])
    .join("")
    .trim();
}

function extractTableCell(cellXml: string): string {
  // Extrait TOUT le texte de la cellule, même s'il y a plusieurs <w:t>
  const matches = [...cellXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  const text = matches
    .map((x) => x[1])
    .join(" ")
    .trim();

  // Nettoie les espaces multiples et les retours à la ligne
  return text.replace(/\s+/g, " ");
}

/**
 * Applique les transformations au template de code
 * Transformations supportées: padStart, toUpperCase, toLowerCase, replace
 */
function applyTransformations(value: string, template: string): string {
  // Remplacer $1, $2, etc. par la valeur et appliquer les transformations
  let result = value;

  // Extraire les transformations après les ":"
  const parts = template.split(":");

  // Le premier part contient la valeur brute
  for (let i = 1; i < parts.length; i++) {
    const transform = parts[i].trim();

    // padStart(length, fillString)
    const padMatch = transform.match(/^padStart\((\d+),(.)\)$/);
    if (padMatch) {
      const length = parseInt(padMatch[1]);
      const fillStr = padMatch[2];
      result = result.padStart(length, fillStr);
      continue;
    }

    // toUpperCase()
    if (transform === "toUpperCase()") {
      result = result.toUpperCase();
      continue;
    }

    // toLowerCase()
    if (transform === "toLowerCase()") {
      result = result.toLowerCase();
      continue;
    }

    // replace(pattern, replacement)
    const replaceMatch = transform.match(/^replace\(([^,]+),([^)]*)\)$/);
    if (replaceMatch) {
      const pattern = replaceMatch[1];
      const replacement = replaceMatch[2];
      result = result.replace(new RegExp(pattern, "g"), replacement);
      continue;
    }
  }

  return result;
}

/**
 * Extrait le titre ou contenu selon la configuration
 */
function extractFromConfig(
  text: string,
  config?: ExtractionConfig,
  rowCells?: string[]
): string | undefined {
  if (!config) return undefined;

  if (config.type === "inline" && config.pattern) {
    try {
      const regex = new RegExp(config.pattern);
      const match = text.match(regex);
      if (match) {
        const groupIndex = config.groupIndex ?? 1;
        return match[groupIndex]?.trim();
      }
    } catch (e) {
      console.error("Error in inline extraction:", e);
    }
  } else if (
    config.type === "table" &&
    rowCells &&
    config.columnIndex !== undefined
  ) {
    const cellText = rowCells[config.columnIndex];
    return cellText ? cellText.trim() : undefined;
  }

  return undefined;
}

/**
 * Extrait les requirements d'un texte selon la configuration
 * Si pas de codeTemplate, code = originalCapture
 */
function extractRequirements(
  text: string,
  config?: RequirementConfig,
  rowCells?: string[]
): Array<{
  code: string;
  originalCapture: string;
  title?: string;
  content?: string;
}> {
  if (!config?.capturePattern) {
    return [];
  }

  const requirements: Array<{
    code: string;
    originalCapture: string;
    title?: string;
    content?: string;
  }> = [];
  const seenCodes = new Set<string>();

  try {
    const regex = new RegExp(config.capturePattern, "g");
    let match;

    while ((match = regex.exec(text)) !== null) {
      const originalCapture = match[0]; // La match complète

      let code: string;

      if (config.codeTemplate) {
        // Appliquer le template avec transformations
        const groupIndex = config.captureGroupIndex ?? 1;
        const captured = match[groupIndex];

        if (!captured) continue;

        const transformPart = config.codeTemplate.substring(
          config.codeTemplate.indexOf(`$${groupIndex}`) + 2
        );
        const transformed = applyTransformations(captured, transformPart);
        code = config.codeTemplate
          .substring(0, config.codeTemplate.indexOf(`$${groupIndex}`))
          .concat(transformed);
      } else {
        // Pas de template → code = originalCapture
        code = originalCapture;
      }

      // Deduplication: ne pas capturer deux fois le même code
      if (seenCodes.has(code)) {
        continue;
      }

      seenCodes.add(code);

      // Extraire titre et contenu
      const title = extractFromConfig(text, config.titleExtraction, rowCells);
      const content = extractFromConfig(
        text,
        config.contentExtraction,
        rowCells
      );

      const requirement: any = {
        code: code,
        originalCapture: originalCapture,
      };

      if (title) requirement.title = title;
      if (content) requirement.content = content;

      requirements.push(requirement);

      // Reset regex lastIndex après chaque match pour éviter les bugs
      regex.lastIndex = match.index + 1;
    }
  } catch (e) {
    console.error("Error extracting requirements:", e);
  }

  return requirements;
}

function detectHeading(
  xml: string,
  styleMap: Map<string, number>
): number | null {
  // Check for "Title" style
  if (xml.includes('<w:pStyle w:val="Title"')) {
    return 1;
  }

  // Extract style reference from paragraph
  const styleMatch = xml.match(/<w:pStyle w:val="([^"]+)"/);
  if (styleMatch) {
    const styleId = styleMatch[1];

    // Check if it's in our mapped styles
    if (styleMap.has(styleId)) {
      return styleMap.get(styleId) || null;
    }

    // Fallback pattern matching
    const levelMatch = styleId.match(/(?:Heading|Titre)(\d+)/i);
    if (levelMatch) {
      return parseInt(levelMatch[1]);
    }
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    const contentType = req.headers.get("content-type") || "";
    let arrayBuffer: ArrayBuffer;
    let requirementConfig: RequirementConfig | undefined;

    // Support form-data upload
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File;
      if (!file) {
        return new Response("Missing file", { status: 400 });
      }
      arrayBuffer = await file.arrayBuffer();

      // Optional: get requirement config from form
      const configStr = form.get("requirementConfig") as string;
      if (configStr) {
        try {
          requirementConfig = JSON.parse(configStr);
        } catch (e) {
          console.warn("Invalid requirementConfig JSON:", e);
        }
      }
    } else {
      // Support raw binary upload or JSON with embedded file
      const body = await req.json().catch(() => null);

      if (body?.file) {
        // File passed as base64 in JSON
        const fileData = body.file;
        if (typeof fileData === "string") {
          arrayBuffer = Uint8Array.from(atob(fileData), (c) =>
            c.charCodeAt(0)
          ).buffer;
        } else {
          arrayBuffer = new Uint8Array(fileData).buffer;
        }
        requirementConfig = body.requirementConfig;
      } else {
        arrayBuffer = await req.arrayBuffer();
      }
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return new Response(JSON.stringify({ error: "document.xml not found" }), {
        status: 400,
      });
    }

    const styleMap = await buildStyleMap(zip);
    const xml = await documentFile.async("string");

    // Parse body content in order (mix of paragraphs and tables)
    const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/);
    if (!bodyMatch) {
      return new Response(JSON.stringify({ error: "body not found" }), {
        status: 400,
      });
    }

    const bodyContent = bodyMatch[1];

    // Split into paragraphs AND tables, maintaining order
    const elements = [
      ...bodyContent.matchAll(/(<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>)/g),
    ].map((m) => m[0]);

    const sections: Section[] = [];
    let current: Section = {
      level: 0,
      title: "Root",
      content: [] as string[],
      tables: [] as string[][],
      requirements: [] as Array<{
        code: string;
        originalCapture: string;
        title?: string;
        content?: string;
      }>,
    };

    sections.push(current);

    for (const element of elements) {
      // Check if it's a table
      if (element.startsWith("<w:tbl")) {
        const rows = [...element.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)];
        const parsedTable = rows.map((r) => {
          const cells = [...r[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)];
          const rowCells = cells.map((c) => extractTableCell(c[0]));

          // Extract requirements from each cell in this row (avec accès aux rowCells pour table extraction)
          const rowRequirements = rowCells.flatMap((cellText, cellIndex) => {
            return extractRequirements(cellText, requirementConfig, rowCells);
          });

          // Éviter les doublons si plusieurs cellules triggent la même requirement
          const uniqueReqs = new Map<string, (typeof rowRequirements)[0]>();
          rowRequirements.forEach((req) => {
            if (!uniqueReqs.has(req.code)) {
              uniqueReqs.set(req.code, req);
            }
          });

          current.requirements.push(...Array.from(uniqueReqs.values()));

          return rowCells;
        });

        current.tables.push(...parsedTable);
      }
      // It's a paragraph
      else {
        const text = extractText(element);
        if (!text) continue;

        const headingLevel = detectHeading(element, styleMap);

        if (headingLevel) {
          current = {
            level: headingLevel,
            title: text,
            content: [] as string[],
            tables: [] as string[][],
            requirements: [] as Array<{
              code: string;
              originalCapture: string;
              title?: string;
              content?: string;
            }>,
          };
          sections.push(current);
        } else {
          current.content.push(text);

          // Extract requirements from paragraph content (pas de rowCells pour inline)
          const reqs = extractRequirements(text, requirementConfig);
          current.requirements.push(...reqs);
        }
      }
    }

    return new Response(JSON.stringify({ structured: sections }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
