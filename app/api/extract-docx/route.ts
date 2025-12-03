import { NextRequest, NextResponse } from "next/server";
import DocxParser from "docx-parser";

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
 * Détecte le niveau de heading à partir du style
 */
function detectHeadingLevel(paragraph: any): number | null {
  if (!paragraph.style) return null;

  const styleName = paragraph.style.toLowerCase();

  // Heading ou Titre
  const headingMatch = styleName.match(/(?:heading|titre)[\s-]*(\d+)/);
  if (headingMatch) {
    return parseInt(headingMatch[1]);
  }

  // Title
  if (styleName === "title" || styleName === "titre") {
    return 1;
  }

  return null;
}

/**
 * Extrait le texte d'un paragraphe
 */
function getParagraphText(paragraph: any): string {
  if (!paragraph.runs) return "";

  return paragraph.runs
    .map((run: any) => {
      if (typeof run === "string") return run;
      if (run.text) return run.text;
      return "";
    })
    .join("")
    .trim();
}

/**
 * Extrait les cellules d'une table
 */
function getTableRows(table: any): string[][] {
  if (!table.rows) return [];

  return table.rows.map((row: any) => {
    if (!row.cells) return [];

    return row.cells.map((cell: any) => {
      if (!cell.paragraphs) return "";

      return cell.paragraphs
        .map((para: any) => getParagraphText(para))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer;
    let requirementConfig: RequirementConfig | undefined;

    // Support form-data upload
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    buffer = Buffer.from(await file.arrayBuffer());

    // Optional: get requirement config from form
    const configStr = formData.get("requirementConfig") as string;
    if (configStr) {
      try {
        requirementConfig = JSON.parse(configStr);
      } catch (e) {
        console.warn("Invalid requirementConfig JSON:", e);
      }
    }

    // Parse DOCX file
    const docxData = await new Promise<any>((resolve, reject) => {
      DocxParser.parseBuffer(buffer, (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    if (!docxData) {
      return NextResponse.json(
        { error: "Failed to parse DOCX file" },
        { status: 400 }
      );
    }

    // Build sections from parsed content
    const sections: Section[] = [];
    let currentSection: Section = {
      level: 0,
      title: "Root",
      content: [],
      tables: [],
      requirements: [],
    };

    sections.push(currentSection);

    // Process all document elements
    if (docxData.paragraphs && Array.isArray(docxData.paragraphs)) {
      for (const paragraph of docxData.paragraphs) {
        const text = getParagraphText(paragraph);

        if (!text) continue;

        const headingLevel = detectHeadingLevel(paragraph);

        if (headingLevel) {
          currentSection = {
            level: headingLevel,
            title: text,
            content: [],
            tables: [],
            requirements: [],
          };
          sections.push(currentSection);
        } else {
          currentSection.content.push(text);

          // Extract requirements from paragraph
          const reqs = extractRequirements(text, requirementConfig);
          currentSection.requirements.push(...reqs);
        }
      }
    }

    // Process tables
    if (docxData.tables && Array.isArray(docxData.tables)) {
      for (const table of docxData.tables) {
        const rows = getTableRows(table);

        currentSection.tables.push(...rows);

        // Extract requirements from table cells
        for (const row of rows) {
          const rowText = row.join(" ");
          const reqs = extractRequirements(rowText, requirementConfig, row);
          currentSection.requirements.push(...reqs);
        }
      }
    }

    return NextResponse.json({
      success: true,
      structured: sections,
    });
  } catch (error: any) {
    console.error("DOCX extraction error:", error);
    return NextResponse.json(
      {
        error: "Failed to extract DOCX",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
