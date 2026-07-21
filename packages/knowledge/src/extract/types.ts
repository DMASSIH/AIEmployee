import type { SupportedFormat } from '@aie/core';

export interface ExtractResult {
  /** Full plain text of the document. */
  text: string;
  /** Optional per-page text (PDFs) so chunks can carry a page number. */
  pages?: string[];
}

/** A pluggable text extractor for one format. Stateless and pure w.r.t. I/O. */
export interface Extractor {
  readonly format: SupportedFormat;
  extract(buffer: Buffer): Promise<ExtractResult>;
}
