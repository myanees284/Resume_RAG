import { AppError } from "../../src/middleware/errorHandler";
import {
  applyRerankToCandidates,
  parseLlmJson,
  validateRerankOutput,
  validateSummaryOutput,
} from "../../src/modules/retrieval/utils/llmOutput";
import { LLMService } from "../../src/modules/retrieval/services/LLMService";
import { toSearchCandidate } from "../../src/modules/retrieval/utils/candidateMapper";

describe("LLM output validation", () => {
  const allowed = new Set(["a", "b"]);

  it("keeps only supplied resume IDs and drops hallucinations", () => {
    const ranked = validateRerankOutput(
      {
        results: [
          { resumeId: "b", relevanceScore: 0.2, reason: "partial" },
          { resumeId: "invented", relevanceScore: 0.99, reason: "fake" },
          { resumeId: "a", relevanceScore: 0.96, reason: "strong" },
        ],
      },
      allowed,
      10
    );

    expect(ranked.map((item) => item.resumeId)).toEqual(["a", "b"]);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseLlmJson("not-json")).toThrow(AppError);
  });

  it("reads a summary string from JSON", () => {
    expect(validateSummaryOutput({ summary: " Strong fit. " })).toBe(
      "Strong fit."
    );
  });
});

describe("LLMService rerank mapping", () => {
  it("applies LLM order onto original candidates", () => {
    const candidates = [
      toSearchCandidate({ resumeId: "a", source: "bm25", snippet: "A" }),
      toSearchCandidate({ resumeId: "b", source: "vector", snippet: "B" }),
    ];

    const reranked = applyRerankToCandidates(candidates, [
      { resumeId: "b", relevanceScore: 0.9, reason: "better" },
      { resumeId: "a", relevanceScore: 0.1 },
    ]);

    expect(reranked.map((candidate) => candidate.resumeId)).toEqual(["b", "a"]);
    expect(reranked[0].rank).toBe(1);
    expect(reranked[0].relevanceScore).toBe(0.9);
  });

  it("calls Groq through the injected completer", async () => {
    const complete = jest.fn().mockResolvedValue({
      results: [
        {
          resumeId: "a",
          relevanceScore: 0.96,
          reason: "Strong match for RAG",
        },
      ],
    });
    const llm = new LLMService(complete);
    const candidates = [
      toSearchCandidate({
        resumeId: "a",
        source: "bm25",
        snippet: "RAG DeepEval MCP",
      }),
    ];

    const reranked = await llm.rerankCandidates("senior QA RAG", candidates, 10);

    expect(complete).toHaveBeenCalled();
    expect(reranked[0].resumeId).toBe("a");
    expect(reranked[0].relevanceScore).toBe(0.96);
  });
});
