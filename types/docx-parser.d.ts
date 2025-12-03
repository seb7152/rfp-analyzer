declare module "docx-parser" {
  interface DocxParserCallback {
    (err: Error | null, data?: any): void;
  }

  interface DocxParser {
    parseBuffer(buffer: Buffer, callback: DocxParserCallback): void;
  }

  const DocxParser: DocxParser;
  export default DocxParser;
}
