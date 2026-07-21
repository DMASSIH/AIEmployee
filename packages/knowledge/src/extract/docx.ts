import mammoth from 'mammoth';
import type { Extractor, ExtractResult } from './types.js';

export class DocxExtractor implements Extractor {
  readonly format = 'docx' as const;

  async extract(buffer: Buffer): Promise<ExtractResult> {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  }
}
