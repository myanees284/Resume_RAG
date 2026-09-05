import { AppError } from "../../src/middleware/errorHandler";
import { LLMService } from "../../src/modules/retrieval/services/LLMService";
import { parseSummarizeRequest } from "../../src/modules/retrieval/utils/summarizeRequest";
import { toSearchCandidate } from "../../src/modules/retrieval/utils/candidateMapper";

describe("summarize request parsing", () => {
  it("defaults to a short summary", () => {
    expect(
      parseSummarizeRequest({
        query: "Senior QA architect with GenAI RAG",
        candidate: {
          resumeId: "abc",
          snippet: "13+ years RAG DeepEval MCP",
        },
      }).options
    ).toEqual({ style: "short", maxTokens: 150 });
  });

  it("rejects a missing snippet", () => {
    expect(() =>
      parseSummarizeRequest({
        query: "RAG",
        candidate: { resumeId: "abc" },
      })
    ).toThrow(AppError);
  });
});

describe("summarizeCandidateFit", () => {
  it("returns the Groq summary text", async () => {
    const complete = jest.fn().mockResolvedValue({
      summary: "Strong fit for senior RAG evaluation work.",
    });
    const llm = new LLMService(complete);

    await expect(
      llm.summarizeCandidateFit(
        "Senior QA architect with GenAI RAG",
        toSearchCandidate({
          resumeId: "abc",
          source: "bm25",
          snippet: "13+ years RAG DeepEval MCP",
        }),
        { style: "short", maxTokens: 150 }
      )
    ).resolves.toBe("Strong fit for senior RAG evaluation work.");
  });
});
