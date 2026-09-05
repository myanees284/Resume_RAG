import { toStoredResumeRecord } from "../../src/modules/retrieval/repositories/ResumeRepository";
import {
  SNIPPET_MAX_CHARS,
  buildCandidateSnippet,
  experienceFilterQuery,
  matchesMinYearsExperience,
  toResumeSummary,
} from "../../src/modules/retrieval/utils/resumeRecord";

describe("resume repository mapping", () => {
  it("maps a Mongo document without mutating fields", () => {
    const record = toStoredResumeRecord({
      _id: "691db80aa895776f97b6eca6",
      name: "Rajesh Mohan Kumar",
      role: "Test Architect",
      totalExperience: 13,
      skills: ["RAG", "DeepEval"],
      embedding: [0.1, 0.2],
      embeddingDimension: 2,
      embeddingModel: "mistral-embed",
    });

    expect(record?._id).toBe("691db80aa895776f97b6eca6");
    expect(record?.skills).toEqual(["RAG", "DeepEval"]);
    expect(record?.embedding).toHaveLength(2);
  });

  it("returns null for a missing document", () => {
    expect(toStoredResumeRecord(null)).toBeNull();
  });

  it("filters by minimum years of experience", () => {
    expect(matchesMinYearsExperience(13, 10)).toBe(true);
    expect(matchesMinYearsExperience(5, 10)).toBe(false);
    expect(matchesMinYearsExperience(null, 10)).toBe(false);
    expect(matchesMinYearsExperience(5)).toBe(true);
    expect(experienceFilterQuery(10)).toEqual({ totalExperience: { $gte: 10 } });
    expect(experienceFilterQuery()).toEqual({});
  });

  it("builds a size-limited snippet for later LLM re-ranking", () => {
    const snippet = buildCandidateSnippet({
      experienceSummary: "Enterprise QA",
      role: "Test Architect",
      skills: ["RAG"],
      rawText: "x".repeat(5000),
    });

    expect(snippet.length).toBe(SNIPPET_MAX_CHARS);
    expect(snippet.startsWith("Enterprise QA")).toBe(true);
  });

  it("does not include the embedding vector in the HTTP summary", () => {
    const summary = toResumeSummary({
      _id: "abc",
      skills: ["RAG"],
      jobTitles: [],
      embedding: Array.from({ length: 1024 }, (_, index) => index * 0.001),
      embeddingDimension: 1024,
      embeddingModel: "mistral-embed",
    });

    expect(summary.resumeId).toBe("abc");
    expect(summary.hasEmbedding).toBe(true);
    expect(summary).not.toHaveProperty("embedding");
  });
});
