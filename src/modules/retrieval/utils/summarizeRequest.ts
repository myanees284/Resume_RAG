import { AppError } from "../../../middleware/errorHandler";
import { SearchCandidate } from "../types/retrieval.types";
import { SummarizeOptions } from "../services/LLMService";

export function parseSummarizeRequest(body: unknown): {
  query: string;
  candidate: SearchCandidate;
  options: SummarizeOptions;
} {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const payload = body as {
    query?: unknown;
    candidate?: { resumeId?: unknown; snippet?: unknown };
    style?: unknown;
    maxTokens?: unknown;
  };

  if (typeof payload.query !== "string" || payload.query.trim() === "") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  const resumeId =
    typeof payload.candidate?.resumeId === "string"
      ? payload.candidate.resumeId.trim()
      : "";
  const snippet =
    typeof payload.candidate?.snippet === "string"
      ? payload.candidate.snippet
      : "";

  if (!resumeId || snippet.trim() === "") {
    throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
  }

  let style: SummarizeOptions["style"] = "short";
  if (payload.style !== undefined) {
    if (payload.style !== "short" && payload.style !== "detailed") {
      throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
    }
    style = payload.style;
  }

  let maxTokens = style === "short" ? 150 : 400;
  if (payload.maxTokens !== undefined) {
    if (
      typeof payload.maxTokens !== "number" ||
      !Number.isInteger(payload.maxTokens) ||
      payload.maxTokens < 1
    ) {
      throw new AppError(400, "INVALID_SEARCH_QUERY", "Search query is required");
    }
    maxTokens = Math.min(payload.maxTokens, 500);
  }

  return {
    query: payload.query.trim(),
    candidate: {
      resumeId,
      snippet,
      sources: ["bm25"],
    },
    options: { style, maxTokens },
  };
}
