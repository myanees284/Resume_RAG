import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { SearchFilters } from "../types/retrieval.types";

const MAX_QUERY_CHARS = 8000;
const MAX_TOP_K = 50;

export interface ParsedSearchRequest {
  query: string;
  topK: number;
  filters: SearchFilters;
}

export function parseSearchRequest(body: unknown): ParsedSearchRequest {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const payload = body as {
    query?: unknown;
    topK?: unknown;
    filters?: { minYearsExperience?: unknown };
  };

  if (typeof payload.query !== "string" || payload.query.trim() === "") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const query = payload.query.trim();
  if (query.length > MAX_QUERY_CHARS) {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  let topK = env.retrievalDefaultTopK;
  if (payload.topK !== undefined) {
    if (typeof payload.topK !== "number" || !Number.isInteger(payload.topK) || payload.topK < 1) {
      throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
    }
    topK = Math.min(payload.topK, MAX_TOP_K);
  }

  const filters: SearchFilters = {};
  const minYears = payload.filters?.minYearsExperience;
  if (minYears !== undefined) {
    if (typeof minYears !== "number" || !Number.isFinite(minYears) || minYears < 0) {
      throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
    }
    filters.minYearsExperience = minYears;
  }

  return { query, topK, filters };
}
