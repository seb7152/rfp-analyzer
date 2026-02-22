import { NextResponse } from "next/server";
import { marked } from "marked";
import HTMLtoDOCX from "html-to-docx";

export async function POST(req: Request) {
    try {
        const { markdown, title } = await req.json();

        if (!markdown) {
            return NextResponse.json(
                { error: "Markdown content is required" },
                { status: 400 }
            );
        }

        // Pre-process dirty markdown like we do on the frontend
        const processedMarkdown = markdown
            // Convert checkboxes to unicode ballot boxes for DOCX compat
            .replace(/^(\s*)-\s*\[\s*\]\s*/gm, "$1- ☐ ")
            .replace(/^(\s*)-\s*\[x\]\s*/gmi, "$1- ☑ ")
            .replace(/^#(\d+\.)/gm, "### $1");

        // Convert markdown to HTML
        const htmlString = await marked.parse(processedMarkdown, { breaks: true, gfm: true });

        // Add inline HTML styling that Word/html-to-docx understands
        // We add some custom CSS classes to tables so html-to-docx renders them nicely
        const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #333333; }
            h1 { font-family: 'Arial', sans-serif; font-size: 18pt; color: #1e293b; margin-top: 24pt; margin-bottom: 12pt; }
            h2 { font-family: 'Arial', sans-serif; font-size: 14pt; color: #334155; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1px solid #cbd5e1; }
            h3 { font-family: 'Arial', sans-serif; font-size: 12pt; color: #475569; margin-top: 12pt; margin-bottom: 6pt; }
            table { border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; margin-bottom: 12pt; }
            th { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 6pt; font-weight: bold; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 6pt; vertical-align: top; }
            p { margin-bottom: 8pt; line-height: 1.5; }
            ul, ol { margin-bottom: 8pt; padding-left: 20pt; }
            li { margin-bottom: 4pt; }
            /* Simple task list support */
            input[type=checkbox] { margin-right: 4pt; }
          </style>
        </head>
        <body>
          ${htmlString}
        </body>
      </html>
    `;

        // Convert HTML to DOCX using the library
        const fileBuffer = await HTMLtoDOCX(styledHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
        });

        const filename = `${title || "export"}.docx`;

        // Send the docx buffer down
        return new Response(fileBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Export DOCX error:", error);
        return NextResponse.json(
            { error: "Failed to create DOCX export" },
            { status: 500 }
        );
    }
}
