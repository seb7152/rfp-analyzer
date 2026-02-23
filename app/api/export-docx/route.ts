import { NextResponse } from "next/server";
import { marked, type Token, type Tokens } from "marked";
import {
    AlignmentType,
    convertInchesToTwip,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from "docx";

type DocxChild = Paragraph | Table;

/** Remove characters that are illegal in XML 1.0 */
function sanitize(text: string): string {
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\uFFFE|\uFFFF/g, "");
}

function decodeEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

type RunCtx = { bold?: boolean; italics?: boolean; strike?: boolean };

/** Recursively convert marked inline tokens to TextRun objects */
function inlineTokensToRuns(tokens: Token[], ctx: RunCtx = {}): TextRun[] {
    const runs: TextRun[] = [];

    for (const token of tokens) {
        switch (token.type) {
            case "text": {
                const t = token as Tokens.Text;
                if (t.tokens) {
                    runs.push(...inlineTokensToRuns(t.tokens, ctx));
                } else {
                    const text = sanitize(decodeEntities(t.text));
                    if (text) runs.push(new TextRun({ text, ...ctx }));
                }
                break;
            }
            case "strong": {
                const t = token as Tokens.Strong;
                runs.push(...inlineTokensToRuns(t.tokens ?? [], { ...ctx, bold: true }));
                break;
            }
            case "em": {
                const t = token as Tokens.Em;
                runs.push(...inlineTokensToRuns(t.tokens ?? [], { ...ctx, italics: true }));
                break;
            }
            case "del": {
                const t = token as Tokens.Del;
                runs.push(...inlineTokensToRuns(t.tokens ?? [], { ...ctx, strike: true }));
                break;
            }
            case "codespan": {
                const t = token as Tokens.Codespan;
                runs.push(new TextRun({ text: sanitize(t.text), font: "Courier New", size: 18 }));
                break;
            }
            case "link": {
                const t = token as Tokens.Link;
                runs.push(...inlineTokensToRuns(t.tokens ?? [], ctx));
                break;
            }
            case "br": {
                runs.push(new TextRun({ break: 1 }));
                break;
            }
            case "escape": {
                const t = token as Tokens.Escape;
                const text = sanitize(decodeEntities(t.text));
                if (text) runs.push(new TextRun({ text, ...ctx }));
                break;
            }
            // html, image, space → skip
        }
    }

    return runs;
}

/** Extract TextRuns from a block token that has an inline tokens array */
function blockToRuns(token: { tokens?: Token[]; text?: string }): TextRun[] {
    if (token.tokens && token.tokens.length > 0) {
        return inlineTokensToRuns(token.tokens);
    }
    if (token.text) {
        const text = sanitize(decodeEntities(token.text));
        return text ? [new TextRun({ text })] : [];
    }
    return [];
}

/** Extract TextRuns from a list item (item.tokens[0] holds a text block with inline tokens) */
function listItemToRuns(item: Tokens.ListItem): TextRun[] {
    if (item.tokens && item.tokens.length > 0) {
        const first = item.tokens[0] as { tokens?: Token[]; text?: string };
        return blockToRuns(first);
    }
    const text = sanitize(decodeEntities(item.text));
    return text ? [new TextRun({ text })] : [];
}

/**
 * Split table-cell text into individual bullet items.
 * Handles two AI-generated patterns:
 *   1. Real or literal \n between items: "• Q1?\n• Q2?\n• Q3?"
 *   2. Inline • separator without newlines: "• Q1? • Q2? • Q3?"
 */
function splitCellContent(raw: string): { isBullet: boolean; content: string }[] {
    // Normalise literal "\n" (2-char sequence) to a real newline
    const text = raw.replace(/\\n/g, "\n").trim();

    // Split on real newlines first
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 1) {
        return lines.map((line) => {
            const m = /^[-*•]\s*(.+)/.exec(line);
            return { isBullet: !!m, content: m ? m[1].trim() : line };
        });
    }

    // Single line: split on • as inline separator (lookahead keeps • in each part)
    if (text.includes("•")) {
        const parts = text.split(/\s*(?=•)/).map((p) => p.trim()).filter((p) => p.length > 0);
        if (parts.length > 1) {
            return parts.map((p) => ({
                isBullet: p.startsWith("•"),
                content: p.replace(/^•\s*/, "").trim(),
            }));
        }
    }

    return [{ isBullet: false, content: text }];
}

/**
 * Convert a table cell to one or more Paragraphs.
 * Falls back to full inline-token rendering for single-item cells.
 */
function cellToChildren(cell: { tokens?: Token[]; text?: string }): Paragraph[] {
    const rawText = (cell.text ?? "").trim();
    const items = splitCellContent(rawText);

    if (items.length <= 1) {
        // Preserve inline formatting (bold/italic) via token rendering
        return [new Paragraph({ children: blockToRuns(cell), spacing: { after: 0 } })];
    }

    return items.map(({ isBullet, content }, idx) => {
        const text = sanitize(decodeEntities(content));
        return new Paragraph({
            children: isBullet
                ? [new TextRun({ text: "• " }), new TextRun({ text })]
                : [new TextRun({ text })],
            spacing: { after: idx < items.length - 1 ? 60 : 0 },
        });
    });
}

const HEADING_LEVELS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
] as const;

/** Convert an array of block tokens to docx Document children */
function convertTokens(tokens: Token[]): DocxChild[] {
    const elements: DocxChild[] = [];

    for (const token of tokens) {
        switch (token.type) {
            case "heading": {
                const t = token as Tokens.Heading;
                elements.push(
                    new Paragraph({
                        heading: HEADING_LEVELS[Math.min(t.depth - 1, 5)],
                        children: blockToRuns(t),
                        spacing: { before: 240, after: 120 },
                    })
                );
                break;
            }

            case "paragraph": {
                const t = token as Tokens.Paragraph;
                elements.push(
                    new Paragraph({
                        children: blockToRuns(t),
                        spacing: { after: 120 },
                    })
                );
                break;
            }

            case "list": {
                const t = token as Tokens.List;
                for (const item of t.items) {
                    const children = listItemToRuns(item);
                    // Checkbox items (☐/☑) must not get a bullet prefix
                    const isCheckbox =
                        item.text.trimStart().startsWith("☐") ||
                        item.text.trimStart().startsWith("☑");
                    if (isCheckbox) {
                        elements.push(
                            new Paragraph({
                                children,
                                spacing: { after: 60 },
                                indent: {
                                    left: convertInchesToTwip(0.5),
                                    hanging: convertInchesToTwip(0.25),
                                },
                            })
                        );
                    } else if (t.ordered) {
                        elements.push(
                            new Paragraph({
                                children,
                                numbering: { reference: "ordered-list", level: 0 },
                                spacing: { after: 60 },
                            })
                        );
                    } else {
                        elements.push(
                            new Paragraph({
                                children,
                                numbering: { reference: "bullet-list", level: 0 },
                                spacing: { after: 60 },
                            })
                        );
                    }
                }
                break;
            }

            case "table": {
                const t = token as Tokens.Table;
                const tableRows: TableRow[] = [];

                // Header row
                tableRows.push(
                    new TableRow({
                        tableHeader: true,
                        children: t.header.map(
                            (cell) =>
                                new TableCell({
                                    children: cellToChildren(cell),
                                    shading: { fill: "F1F5F9" },
                                })
                        ),
                    })
                );

                // Data rows
                for (const row of t.rows) {
                    tableRows.push(
                        new TableRow({
                            children: row.map(
                                (cell) =>
                                    new TableCell({
                                        children: cellToChildren(cell),
                                    })
                            ),
                        })
                    );
                }

                elements.push(
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    })
                );
                break;
            }

            case "blockquote": {
                const t = token as Tokens.Blockquote;
                elements.push(...convertTokens(t.tokens));
                break;
            }

            case "code": {
                const t = token as Tokens.Code;
                elements.push(
                    new Paragraph({
                        children: [new TextRun({ text: sanitize(t.text), font: "Courier New", size: 18 })],
                        spacing: { before: 120, after: 120 },
                        indent: { left: convertInchesToTwip(0.25) },
                    })
                );
                break;
            }

            case "hr": {
                elements.push(
                    new Paragraph({
                        children: [new TextRun({ text: "─".repeat(60) })],
                        spacing: { after: 120 },
                    })
                );
                break;
            }

            case "space":
                // Skip empty tokens
                break;
        }
    }

    return elements;
}

export async function POST(req: Request) {
    try {
        const { markdown, title } = await req.json();

        if (!markdown) {
            return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
        }

        // Pre-process: convert checkboxes to unicode, fix heading-number collisions
        const processedMarkdown = (markdown as string)
            .replace(/^(\s*)-\s*\[\s*\]\s*/gm, "$1- ☐ ")
            .replace(/^(\s*)-\s*\[x\]\s*/gmi, "$1- ☑ ")
            .replace(/^#(\d+\.)/gm, "### $1");

        // Tokenize markdown into block tokens
        const tokens = marked.lexer(processedMarkdown);

        // Convert tokens to docx elements
        const children = convertTokens(Array.from(tokens));

        // docx requires at least one child in a section
        if (children.length === 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        }

        const doc = new Document({
            numbering: {
                config: [
                    {
                        reference: "bullet-list",
                        levels: [
                            {
                                level: 0,
                                format: LevelFormat.BULLET,
                                text: "•",
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: {
                                            left: convertInchesToTwip(0.5),
                                            hanging: convertInchesToTwip(0.25),
                                        },
                                    },
                                },
                            },
                        ],
                    },
                    {
                        reference: "ordered-list",
                        levels: [
                            {
                                level: 0,
                                format: LevelFormat.DECIMAL,
                                text: "%1.",
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: {
                                            left: convertInchesToTwip(0.5),
                                            hanging: convertInchesToTwip(0.25),
                                        },
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: convertInchesToTwip(1),
                                right: convertInchesToTwip(1),
                                bottom: convertInchesToTwip(1),
                                left: convertInchesToTwip(1),
                            },
                        },
                    },
                    children,
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        const filename = `${title || "export"}.docx`;

        return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(buffer.length),
            },
        });
    } catch (error) {
        console.error("Export DOCX error:", error);
        return NextResponse.json({ error: "Failed to create DOCX export" }, { status: 500 });
    }
}
