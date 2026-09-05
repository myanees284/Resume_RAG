import { AppError } from "../../../middleware/errorHandler";
import { SearchCandidate } from "../types/retrieval.types";

export interface RerankLlmItem {
  resumeId: string;
  relevanceScore: number;
  reason?: string;
}

export function parseLlmJson(content: string): unknown {
  try {
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch {
    throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
  }
}

export function validateRerankOutput(
  value: unknown,
  allowedIds: Set<string>,
  topK: number
): RerankLlmItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
  }

  const results = (value as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
  }

  const ranked: RerankLlmItem[] = [];

  for (const item of results) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as {
      resumeId?: unknown;
      relevanceScore?: unknown;
      reason?: unknown;
    };

    if (typeof row.resumeId !== "string" || !allowedIds.has(row.resumeId)) {
      continue;
    }

    const score =
      typeof row.relevanceScore === "number" && Number.isFinite(row.relevanceScore)
        ? row.relevanceScore
        : NaN;
    if (!Number.isFinite(score)) {
      continue;
    }

    ranked.push({
      resumeId: row.resumeId,
      relevanceScore: score,
      reason: typeof row.reason === "string" ? row.reason : undefined,
    });
  }

  const unique = new Map<string, RerankLlmItem>();
  for (const item of ranked) {
    if (!unique.has(item.resumeId)) {
      unique.set(item.resumeId, item);
    }
  }

  return [...unique.values()]
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, topK);
}

export function applyRerankToCandidates(
  candidates: SearchCandidate[],
  ranked: RerankLlmItem[]
): SearchCandidate[] {
  const byId = new Map(candidates.map((candidate) => [candidate.resumeId, candidate]));
  const reranked: SearchCandidate[] = [];

  for (const [index, item] of ranked.entries()) {
    const candidate = byId.get(item.resumeId);
    if (!candidate) {
      continue;
    }

    reranked.push({
      ...candidate,
      rank: index + 1,
      relevanceScore: item.relevanceScore,
      reason: item.reason,
    });
  }

  return reranked;
}

export function validateSummaryOutput(value: unknown): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const summary = (value as { summary?: unknown }).summary;
    if (typeof summary === "string" && summary.trim() !== "") {
      return summary.trim();
    }
  }

  throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
}
