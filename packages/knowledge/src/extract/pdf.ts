import { createRequire } from 'node:module';
import type { Extractor, ExtractResult } from './types.js';

// The lib subpath is the pure parser; pdf-parse's index.js reads a sample file
// when loaded as the main module. No types ship for the subpath, so type the
// import explicitly rather than leaning on `any`.
type PdfParse = (data: Buffer) => Promise<{ text: string; numpages: number }>;
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as PdfParse;

export class PdfExtractor implements Extractor {
  readonly format = 'pdf' as const;

  async extract(buffer: Buffer): Promise<ExtractResult> {
    const parsed = await pdfParse(buffer);
    // pdf-parse joins pages with form-feed (\f); split so chunks can be page-tagged.
    const pages = parsed.text.split('\f').filter((p) => p.trim().length > 0);
    return { text: parsed.text, pages: pages.length > 0 ? pages : undefined };
  }
}
