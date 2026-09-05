import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { SearchCandidate } from "../types/retrieval.types";

export function parseRerankRequest(body: unknown): {
  query: string;
  candidates: SearchCandidate[];
  topK: number;
} {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const payload = body as {
    query?: unknown;
    candidates?: unknown;
    topK?: unknown;
  };

  if (typeof payload.query !== "string" || payload.query.trim() === "") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const candidates: SearchCandidate[] = [];
  for (const item of payload.candidates) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as { resumeId?: unknown; snippet?: unknown; name?: unknown };
    if (typeof row.resumeId !== "string" || row.resumeId.trim() === "") {
      continue;
    }

    candidates.push({
      resumeId: row.resumeId,
      name: typeof row.name === "string" ? row.name : undefined,
      snippet: typeof row.snippet === "string" ? row.snippet : undefined,
      sources: ["bm25"],
    });
  }

  if (candidates.length === 0) {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const limitedCandidates = candidates.slice(0, 20);

  let topK = env.rerankDefaultTopN;
  if (payload.topK !== undefined) {
    if (typeof payload.topK !== "number" || !Number.isInteger(payload.topK) || payload.topK < 1) {
      throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
    }
    topK = Math.min(payload.topK, 20);
  }

  return { query: payload.query.trim(), candidates: limitedCandidates, topK };
}
