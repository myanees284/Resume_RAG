export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }

    interface Locals {
      fileName?: string;
      ingestTimings?: {
        extractMs: number;
        cleanMs: number;
        parseMs: number;
        embeddingMs: number;
        mongoInsertMs: number;
        totalMs: number;
      };
      searchTimings?: {
        embeddingMs: number;
        bm25Ms: number;
        vectorMs: number;
        rerankMs: number;
        summarizeMs: number;
        totalMs: number;
      };
      searchWarnings?: string[];
    }
  }
}
