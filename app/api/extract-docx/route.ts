import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import busboy from "busboy";
import { Readable } from "stream";

interface ExtractionConfig {
  type: "inline" | "table";
  pattern?: string;
  groupIndex?: number;
  columnIndex?: number;
}

interface RequirementConfig {
  capturePattern?: string;
  codeTemplate?: string;
  captureGroupIndex?: number;
  titleExtraction?: ExtractionConfig;
  contentExtraction?: ExtractionConfig;
}

interface ParsedRequirement {
  code: string;
  originalCapture: string;
  title?: string;
  content?: string;
}

interface Section {
  level: number;
  title: string;
  content: string[];
  tables: string[][];
  requirements: ParsedRequirement[];
}

/**
 * Applique les transformations au template de code
 */
function applyTransformations(value: string, template: string): string {
  let result = value;
  const parts = template.split(":");

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
 */
function extractRequirements(
  text: string,
  config?: RequirementConfig,
  rowCells?: string[]
): ParsedRequirement[] {
  if (!config?.capturePattern) {
    return [];
  }

  const requirements: ParsedRequirement[] = [];
  const seenCodes = new Set<string>();

  try {
    const regex = new RegExp(config.capturePattern, "g");
    let match;

    while ((match = regex.exec(text)) !== null) {
      const originalCapture = match[0];

      let code: string;

      if (config.codeTemplate) {
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
        code = originalCapture;
      }

      if (seenCodes.has(code)) {
        continue;
      }

      seenCodes.add(code);

      const title = extractFromConfig(text, config.titleExtraction, rowCells);
      const content = extractFromConfig(
        text,
        config.contentExtraction,
        rowCells
      );

      const requirement: ParsedRequirement = {
        code: code,
        originalCapture: originalCapture,
      };

      if (title) requirement.title = title;
      if (content) requirement.content = content;

      requirements.push(requirement);
      regex.lastIndex = match.index + 1;
    }
  } catch (e) {
    console.error("Error extracting requirements:", e);
  }

  return requirements;
}

/**
 * Extrait le texte d'un élément XML (paragraphe, cellule, etc)
 * Parcourt tout l'arbre pour trouver les éléments w:t (text nodes)
 */
function extractTextFromElement(element: any): string {
  if (typeof element === "string") {
    return element.trim();
  }

  if (!element || typeof element !== "object") {
    return "";
  }

  const textFragments: string[] = [];

  /**
   * Parcourt récursivement l'objet et collecte tous les textes des éléments w:t
   */
  function collectAllText(obj: any) {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === "string") {
      // Les strings simples sont des attributs, on les ignore
      return;
    }

    if (Array.isArray(obj)) {
      // Parcourir chaque élément du tableau
      obj.forEach((item) => collectAllText(item));
      return;
    }

    if (typeof obj === "object") {
      // Si c'est un élément w:t, extraire le texte
      if (obj["w:t"]) {
        // w:t peut être un objet avec #text ou directement une string
        const textContent = obj["w:t"]["#text"] || obj["w:t"];
        if (typeof textContent === "string" && textContent.trim()) {
          textFragments.push(textContent.trim());
        }
      }

      // Parcourir toutes les clés de l'objet
      // Cela couvre: w:r (runs), w:hyperlink, w:smartTag, etc.
      Object.keys(obj).forEach((key) => {
        if (key !== "@_" && !key.startsWith("@_")) {
          // Ignorer les attributs (qui commencent par @_)
          collectAllText(obj[key]);
        }
      });
    }
  }

  collectAllText(element);

  // Joindre les fragments avec un espace et nettoyer les espacements multiples
  return textFragments.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Parse multipart form data avec busboy
 */
async function parseMultipartForm(
  request: NextRequest
): Promise<{ file?: Buffer; requirementConfig?: RequirementConfig }> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get("content-type") || "";
    const bb = busboy({ headers: { "content-type": contentType } });

    let file: Buffer | undefined;
    let requirementConfig: RequirementConfig | undefined;

    bb.on("file", async (fieldname, fileStream) => {
      console.log(`[extract-docx] File received: ${fieldname}`);

      const chunks: Buffer[] = [];
      fileStream.on("data", (data) => {
        chunks.push(Buffer.from(data));
      });

      fileStream.on("end", () => {
        if (fieldname === "file") {
          file = Buffer.concat(chunks);
          console.log(`[extract-docx] File buffer size: ${file.length} bytes`);
        }
      });

      fileStream.on("error", (err) => {
        console.error(`[extract-docx] File stream error:`, err);
        reject(err);
      });
    });

    bb.on("field", (fieldname, val) => {
      if (fieldname === "requirementConfig") {
        try {
          requirementConfig = JSON.parse(val);
          console.log(`[extract-docx] Config parsed successfully`);
        } catch (e) {
          console.warn(`[extract-docx] Invalid config JSON:`, e);
        }
      }
    });

    bb.on("close", () => {
      console.log("[extract-docx] Busboy parsing complete");
      resolve({ file, requirementConfig });
    });

    bb.on("error", (err) => {
      console.error("[extract-docx] Busboy error:", err);
      reject(err);
    });

    // Convert NextRequest to Node.js stream
    const nodeRequest = request as any;
    if (nodeRequest.body) {
      Readable.from(nodeRequest.body).pipe(bb);
    } else {
      reject(new Error("No request body available"));
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    console.log("[extract-docx] Request received");
    console.log("[extract-docx] Content-Type:", contentType);

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // Parse multipart form
    const { file, requirementConfig } = await parseMultipartForm(request);

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Load DOCX as ZIP
    const zip = new JSZip();
    await zip.loadAsync(file);

    // Read document.xml
    const documentFile = zip.file("word/document.xml");
    if (!documentFile) {
      return NextResponse.json(
        { error: "document.xml not found" },
        { status: 400 }
      );
    }

    let xmlString = await documentFile.async("string");

    // Inject position markers into the XML to preserve document order
    // This allows us to correctly reconstruct the original interleaving of paragraphs and tables
    let positionCounter = 0;
    xmlString = xmlString.replace(/<w:(p|tbl)([\s>])/g, (_match, elementType, remainder) => {
      return `<w:${elementType} _position="${positionCounter++}"${remainder}`;
    });

    // Parse XML with fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
    });

    const doc = parser.parse(xmlString) as any;
    const body = doc?.["w:document"]?.["w:body"];

    if (!body) {
      return NextResponse.json(
        { error: "w:body not found in document" },
        { status: 400 }
      );
    }

    // Collect all paragraphs and tables with their position markers
    const bodyChildrenRaw: any[] = [];

    const paragraphs = Array.isArray(body["w:p"])
      ? body["w:p"]
      : body["w:p"]
        ? [body["w:p"]]
        : [];
    const tables = Array.isArray(body["w:tbl"])
      ? body["w:tbl"]
      : body["w:tbl"]
        ? [body["w:tbl"]]
        : [];

    // Create array with position data
    const positionedElements: Array<{
      type: "p" | "tbl";
      position: number;
      data: any;
    }> = [];

    paragraphs.forEach((p: any) => {
      const pos = parseInt(p["@__position"] || "999999");
      positionedElements.push({ type: "p", position: pos, data: p });
    });

    tables.forEach((t: any) => {
      const pos = parseInt(t["@__position"] || "999999");
      positionedElements.push({ type: "tbl", position: pos, data: t });
    });

    // Sort by position to restore document order
    positionedElements.sort((a, b) => a.position - b.position);

    bodyChildrenRaw.push(
      ...positionedElements.map((elem) => ({
        type: elem.type,
        data: elem.data,
      }))
    );

    console.log(
      `[extract-docx] Found ${bodyChildrenRaw.filter((b) => b.type === "p").length} paragraphs, ${bodyChildrenRaw.filter((b) => b.type === "tbl").length} tables`
    );

    const sections: Section[] = [];
    let currentSection: Section = {
      level: 0,
      title: "Root",
      content: [],
      tables: [],
      requirements: [],
    };

    sections.push(currentSection);

    // Traiter paragraphes et tableaux dans l'ordre du document
    for (const item of bodyChildrenRaw) {
      if (item.type === "p") {
        const paragraph = item.data;
        const text = extractTextFromElement(paragraph);
        if (!text) continue;

        // Déterminer si c'est un titre (heading)
        const pStyle = paragraph["w:pPr"]?.["w:pStyle"];
        const styleVal =
          typeof pStyle === "object" ? pStyle["@_w:val"] : pStyle;

        const isHeading = styleVal && /Heading|Titre/i.test(String(styleVal));

        if (isHeading) {
          // Créer une nouvelle section
          const levelMatch = String(styleVal).match(/(\d+)/);
          const level = levelMatch ? parseInt(levelMatch[1]) : 1;

          currentSection = {
            level,
            title: text,
            content: [],
            tables: [],
            requirements: [],
          };
          sections.push(currentSection);
        } else {
          // C'est un paragraphe normal
          currentSection.content.push(text);

          // Extraire les requirements
          const reqs = extractRequirements(text, requirementConfig);
          currentSection.requirements.push(...reqs);
        }
      } else if (item.type === "tbl") {
        const table = item.data;
        const rows = Array.isArray(table["w:tr"])
          ? table["w:tr"]
          : table["w:tr"]
            ? [table["w:tr"]]
            : [];

        for (const row of rows) {
          const cells = Array.isArray(row["w:tc"])
            ? row["w:tc"]
            : row["w:tc"]
              ? [row["w:tc"]]
              : [];
          const rowCells: string[] = [];

          for (const cell of cells) {
            // Une cellule peut avoir plusieurs paragraphes
            const paragraphs = Array.isArray(cell["w:p"])
              ? cell["w:p"]
              : cell["w:p"]
                ? [cell["w:p"]]
                : [];
            const cellTexts = paragraphs.map((p: any) =>
              extractTextFromElement(p)
            );
            const cellText = cellTexts.join(" ").trim();
            rowCells.push(cellText);
          }

          // Ajouter la ligne aux tables
          if (rowCells.length > 0) {
            currentSection.tables.push(rowCells);
          }

          // Extraire les requirements de chaque cellule
          const rowText = rowCells.join(" ");
          const reqs = extractRequirements(
            rowText,
            requirementConfig,
            rowCells
          );
          currentSection.requirements.push(...reqs);
        }
      }
    }

    return NextResponse.json({
      success: true,
      structured: sections,
    });
  } catch (error: any) {
    console.error("[extract-docx] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to extract DOCX",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
