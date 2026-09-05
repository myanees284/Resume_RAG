import { SearchService } from "../../src/modules/retrieval/services/SearchService";
import { StoredResumeRecord } from "../../src/modules/retrieval/types/retrieval.types";
import {
  SEARCH_CANDIDATE_KEYS,
  isNormalizedCandidate,
} from "../../src/modules/retrieval/utils/candidateMapper";

const sampleResume: StoredResumeRecord = {
  _id: "691db80aa895776f97b6eca6",
  name: "Rajesh Mohan Kumar",
  role: "Test Architect",
  company: "Testleaf",
  skills: ["RAG", "DeepEval"],
  jobTitles: ["Test Architect"],
  experienceSummary: "GenAI QA",
  rawText: "RAG DeepEval MCP",
  embedding: [1, 0],
  embeddingDimension: 2,
};

describe("SearchService normalized candidates", () => {
  const repository = {
    bm25Search: jest.fn(),
    vectorSearch: jest.fn(),
  };
  const embeddingService = {
    embedText: jest.fn(),
  };
  const llmService = {
    rerankCandidates: jest.fn(),
    summarizeCandidateFit: jest.fn(),
  };
  const searchService = new SearchService(
    repository as never,
    embeddingService as never,
    llmService as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes BM25 hits independently", async () => {
    repository.bm25Search.mockResolvedValue([
      { record: sampleResume, score: 8.41 },
    ]);

    const [candidate] = await searchService.bm25Search("RAG DeepEval", {}, 5);

    expect(isNormalizedCandidate(candidate)).toBe(true);
    expect(Object.keys(candidate).sort()).toEqual(
      [...SEARCH_CANDIDATE_KEYS].sort()
    );
    expect(candidate.sources).toEqual(["bm25"]);
    expect(candidate.bm25Score).toBe(8.41);
    expect(candidate.vectorScore).toBeUndefined();
    expect(candidate.snippet).toContain("GenAI QA");
    expect(embeddingService.embedText).not.toHaveBeenCalled();
  });

  it("normalizes vector hits independently", async () => {
    embeddingService.embedText.mockResolvedValue([1, 0]);
    repository.vectorSearch.mockResolvedValue([
      { record: sampleResume, score: 0.5 },
    ]);

    const [candidate] = await searchService.vectorSearch(
      "safe RAG evaluation",
      {},
      5
    );

    expect(isNormalizedCandidate(candidate)).toBe(true);
    expect(candidate.sources).toEqual(["vector"]);
    expect(candidate.vectorScore).toBeCloseTo(1);
    expect(candidate.bm25Score).toBeUndefined();
    expect(repository.bm25Search).not.toHaveBeenCalled();
  });

  it("runs BM25 and vector independently without merging scores", async () => {
    repository.bm25Search.mockResolvedValue([
      { record: sampleResume, score: 8.41 },
    ]);
    embeddingService.embedText.mockResolvedValue([1, 0]);
    repository.vectorSearch.mockResolvedValue([
      { record: sampleResume, score: 0.5 },
    ]);

    const result = await searchService.hybridSearch("RAG evaluation", {}, 5);

    expect(result.bm25[0].resumeId).toBe(sampleResume._id);
    expect(result.vector[0].resumeId).toBe(sampleResume._id);
    expect(result.bm25[0].bm25Score).toBe(8.41);
    expect(result.bm25[0].vectorScore).toBeUndefined();
    expect(result.vector[0].vectorScore).toBeCloseTo(1);
    expect(result.vector[0].bm25Score).toBeUndefined();
    expect(result.timings.bm25Ms).toBeGreaterThanOrEqual(0);
    expect(result.timings.embeddingMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.vectorMs).toBeGreaterThanOrEqual(0);
    expect(result.pool).toHaveLength(1);
    expect(result.pool[0].sources).toEqual(["bm25", "vector"]);
    expect(result.pool[0].bm25Score).toBe(8.41);
    expect(result.pool[0].vectorScore).toBeCloseTo(1);
    expect(result.degraded).toBe(false);
  });

  it("runs end-to-end search with rerank and optional summaries", async () => {
    repository.bm25Search.mockResolvedValue([
      { record: sampleResume, score: 8.41 },
    ]);
    embeddingService.embedText.mockResolvedValue([1, 0]);
    repository.vectorSearch.mockResolvedValue([
      { record: sampleResume, score: 0.5 },
    ]);
    llmService.rerankCandidates.mockResolvedValue([
      {
        resumeId: sampleResume._id,
        name: sampleResume.name,
        role: sampleResume.role,
        company: sampleResume.company,
        skills: sampleResume.skills,
        sources: ["bm25", "vector"],
        rank: 1,
        relevanceScore: 0.96,
      },
    ]);
    llmService.summarizeCandidateFit.mockResolvedValue("Strong RAG fit.");

    const result = await searchService.endToEndSearch("RAG evaluation", {}, {
      bm25TopK: 5,
      vectorTopK: 5,
      rerankTopN: 10,
      finalTopK: 5,
      summarize: true,
      summaryStyle: "short",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].rank).toBe(1);
    expect(result.results[0].summary).toBe("Strong RAG fit.");
    expect(result.degraded).toBe(false);
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("falls back to BM25 when vector search fails", async () => {
    repository.bm25Search.mockResolvedValue([
      { record: sampleResume, score: 8.41 },
    ]);
    embeddingService.embedText.mockRejectedValue(new Error("mistral down"));

    const result = await searchService.endToEndSearch("RAG", {}, {
      bm25TopK: 5,
      vectorTopK: 5,
      rerankTopN: 5,
      finalTopK: 3,
      summarize: false,
      summaryStyle: "short",
    });

    expect(result.vectorFallback).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.warnings).toContain("VECTOR_SEARCH_FAILED");
  });

  it("falls back to vector when BM25 fails", async () => {
    repository.bm25Search.mockRejectedValue(new Error("atlas search down"));
    embeddingService.embedText.mockResolvedValue([1, 0]);
    repository.vectorSearch.mockResolvedValue([
      { record: sampleResume, score: 0.5 },
    ]);
    llmService.rerankCandidates.mockRejectedValue(new Error("groq down"));
    llmService.summarizeCandidateFit.mockRejectedValue(new Error("summary down"));

    const result = await searchService.endToEndSearch("RAG", {}, {
      bm25TopK: 5,
      vectorTopK: 5,
      rerankTopN: 5,
      finalTopK: 3,
      summarize: true,
      summaryStyle: "short",
    });

    expect(result.bm25Fallback).toBe(true);
    expect(result.warnings).toContain("BM25_SEARCH_FAILED");
    expect(result.warnings).toContain("LLM_RERANK_FAILED");
    expect(result.warnings).toContain("SUMMARIZATION_FAILED");
    expect(result.results[0].resumeId).toBe(sampleResume._id);
    expect(result.results[0].summary).toBeUndefined();
  });

  it("throws SEARCH_UNAVAILABLE when both strategies fail", async () => {
    repository.bm25Search.mockRejectedValue(new Error("bm25 down"));
    embeddingService.embedText.mockRejectedValue(new Error("embed down"));

    await expect(
      searchService.endToEndSearch("RAG", {}, {
        bm25TopK: 5,
        vectorTopK: 5,
        rerankTopN: 5,
        finalTopK: 3,
        summarize: false,
        summaryStyle: "short",
      })
    ).rejects.toMatchObject({ errorCode: "SEARCH_UNAVAILABLE" });
  });
});
