import type { SupportedFormat } from '@aie/core';
import type { Extractor, ExtractResult } from './types.js';

/** Plain UTF-8 extractor for `txt` and `md` — the text IS the content. */
export class PlainTextExtractor implements Extractor {
  constructor(readonly format: SupportedFormat) {}

  extract(buffer: Buffer): Promise<ExtractResult> {
    return Promise.resolve({ text: buffer.toString('utf8') });
  }
}
