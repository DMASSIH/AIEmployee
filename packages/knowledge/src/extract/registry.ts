import { SUPPORTED_MIME_TYPES, isSupportedMime, type SupportedFormat } from '@aie/core';
import type { Extractor } from './types.js';
import { PlainTextExtractor } from './text.js';
import { PdfExtractor } from './pdf.js';
import { DocxExtractor } from './docx.js';

/**
 * Format → extractor registry. Supporting a new document type is a two-step,
 * closed-for-modification change: add the MIME to SUPPORTED_MIME_TYPES in
 * @aie/core, then `register()` an Extractor here. The pipeline (extract → chunk
 * → embed) never changes.
 */
const registry = new Map<SupportedFormat, Extractor>();

export function registerExtractor(extractor: Extractor): void {
  registry.set(extractor.format, extractor);
}

registerExtractor(new PdfExtractor());
registerExtractor(new DocxExtractor());
registerExtractor(new PlainTextExtractor('txt'));
registerExtractor(new PlainTextExtractor('md'));

export function getExtractorForFormat(format: SupportedFormat): Extractor {
  const extractor = registry.get(format);
  if (!extractor) throw new Error(`No extractor registered for format "${format}"`);
  return extractor;
}

/** Resolve an extractor from a server-sniffed MIME type. Throws if unsupported. */
export function getExtractorForMime(mime: string): Extractor {
  if (!isSupportedMime(mime)) throw new Error(`Unsupported document type: ${mime}`);
  return getExtractorForFormat(SUPPORTED_MIME_TYPES[mime]);
}
