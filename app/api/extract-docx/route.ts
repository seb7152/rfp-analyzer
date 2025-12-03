import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

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
 * Parse HTML table and extract rows
 */
function parseTableHtml(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const cellRegex = /<t[dh][^>]*>([^<]*)<\/t[dh]>/g;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[0];
    const cells: string[] = [];

    let cellMatch: RegExpExecArray | null;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

export async function POST(request: NextRequest) {
  let buffer: Buffer | null = null;
  let requirementConfig: RequirementConfig | undefined;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error("FormData parse error:", parseErr);
      return NextResponse.json(
        { error: "Failed to parse form data", message: String(parseErr) },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (bufErr) {
      console.error("Buffer creation error:", bufErr);
      return NextResponse.json(
        { error: "Failed to read file", message: String(bufErr) },
        { status: 400 }
      );
    }

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
    if (!buffer) {
      return NextResponse.json(
        { error: "No buffer available for parsing" },
        { status: 400 }
      );
    }

    // Parse DOCX using mammoth
    let result: any;
    try {
      result = await mammoth.convertToHtml({ buffer: buffer as Buffer });
    } catch (parseErr) {
      console.error("Mammoth parse error:", parseErr);
      return NextResponse.json(
        { error: "Failed to parse DOCX file", message: String(parseErr) },
        { status: 400 }
      );
    }

    if (!result || !result.value) {
      return NextResponse.json(
        { error: "Failed to extract content from DOCX file" },
        { status: 400 }
      );
    }

    const html = result.value;

    // Parse HTML to extract text, headings, and tables
    const sections: Section[] = [];
    let currentSection: Section = {
      level: 0,
      title: "Root",
      content: [],
      tables: [],
      requirements: [],
    };

    sections.push(currentSection);

    // Split by heading tags
    const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/g;
    const textRegex = /<p[^>]*>([^<]*)<\/p>/g;
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g;

    let match: RegExpExecArray | null;

    // Process headings and content between them
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const title = match[2].trim();

      if (level <= 6 && title) {
        currentSection = {
          level,
          title,
          content: [],
          tables: [],
          requirements: [],
        };
        sections.push(currentSection);
      }
    }

    // Extract text content
    const textBeforeFirstHeading = html.substring(0, headingRegex.lastIndex);
    textRegex.lastIndex = 0;
    while ((match = textRegex.exec(textBeforeFirstHeading)) !== null) {
      const text = match[1].trim();
      if (text) {
        if (sections.length > 1) {
          sections[sections.length - 1].content.push(text);
        } else {
          currentSection.content.push(text);
        }
      }
    }

    // Extract text content from the entire document
    textRegex.lastIndex = 0;
    while ((match = textRegex.exec(html)) !== null) {
      const text = match[1].trim();
      if (text && currentSection) {
        currentSection.content.push(text);

        // Extract requirements from paragraph text
        const reqs = extractRequirements(text, requirementConfig);
        currentSection.requirements.push(...reqs);
      }
    }

    // Extract tables
    tableRegex.lastIndex = 0;
    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[0];
      const rows = parseTableHtml(tableHtml);

      if (currentSection) {
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
