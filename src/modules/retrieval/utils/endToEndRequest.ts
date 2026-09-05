import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { EndToEndSearchOptions, SearchFilters } from "../types/retrieval.types";
import { parseSearchRequest } from "./searchRequest";

export interface ParsedEndToEndRequest {
  query: string;
  filters: SearchFilters;
  options: EndToEndSearchOptions;
}

export function parseEndToEndRequest(body: unknown): ParsedEndToEndRequest {
  const base = parseSearchRequest(body);
  const payload =
    body && typeof body === "object"
      ? (body as {
          options?: {
            bm25TopK?: unknown;
            vectorTopK?: unknown;
            rerankTopN?: unknown;
            finalTopK?: unknown;
            summarize?: unknown;
            summaryStyle?: unknown;
          };
        })
      : {};

  const raw = payload.options ?? {};

  const options: EndToEndSearchOptions = {
    bm25TopK: optionalPositiveInt(raw.bm25TopK, base.topK),
    vectorTopK: optionalPositiveInt(raw.vectorTopK, base.topK),
    rerankTopN: optionalPositiveInt(raw.rerankTopN, env.rerankDefaultTopN, 20),
    finalTopK: optionalPositiveInt(raw.finalTopK, 5, 20),
    summarize: raw.summarize === true,
    summaryStyle: raw.summaryStyle === "detailed" ? "detailed" : "short",
  };

  if (raw.summaryStyle !== undefined && raw.summaryStyle !== "short" && raw.summaryStyle !== "detailed") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  return { query: base.query, filters: base.filters, options };
}

function optionalPositiveInt(
  value: unknown,
  fallback: number,
  max = 50
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  return Math.min(value, max);
}
