import { env } from "../../../config/env";
import { ResumeSummary, StoredResumeRecord } from "../types/retrieval.types";

export const SNIPPET_MAX_CHARS = 1200;

export function matchesMinYearsExperience(
  totalExperience: unknown,
  minYears?: number
): boolean {
  if (minYears === undefined) {
    return true;
  }

  return typeof totalExperience === "number" && totalExperience >= minYears;
}

export function experienceFilterQuery(minYears?: number): Record<string, unknown> {
  if (minYears === undefined) {
    return {};
  }

  return { totalExperience: { $gte: minYears } };
}

export function buildCandidateSnippet(
  record: Pick<StoredResumeRecord, "experienceSummary" | "role" | "skills" | "rawText">,
  maxChars = SNIPPET_MAX_CHARS
): string {
  const parts = [
    record.experienceSummary ?? "",
    record.role ?? "",
    (record.skills ?? []).join(", "),
    record.rawText ?? "",
  ].filter((part) => part.trim() !== "");

  return parts.join("\n").slice(0, maxChars);
}

export function toResumeSummary(record: StoredResumeRecord): ResumeSummary {
  const embedding = record.embedding ?? [];

  return {
    resumeId: record._id,
    name: record.name,
    role: record.role,
    company: record.company,
    totalExperience: record.totalExperience,
    skills: record.skills ?? [],
    embeddingModel: record.embeddingModel,
    embeddingDimension: record.embeddingDimension ?? embedding.length,
    hasEmbedding:
      embedding.length === (record.embeddingDimension ?? env.embeddingDimension),
    snippet: buildCandidateSnippet(record),
  };
}
