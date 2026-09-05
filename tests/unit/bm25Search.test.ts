import { AppError } from "../../src/middleware/errorHandler";
import { matchedSkills } from "../../src/modules/retrieval/utils/matchedSkills";
import { parseSearchRequest } from "../../src/modules/retrieval/utils/searchRequest";

describe("BM25 request parsing", () => {
  it("parses query, topK, and experience filter", () => {
    expect(
      parseSearchRequest({
        query: "  agentic QA architect RAG MCP DeepEval  ",
        topK: 20,
        filters: { minYearsExperience: 10 },
      })
    ).toEqual({
      query: "agentic QA architect RAG MCP DeepEval",
      topK: 20,
      filters: { minYearsExperience: 10 },
    });
  });

  it("rejects an empty query", () => {
    try {
      parseSearchRequest({ query: " " });
      throw new Error("expected AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCode).toBe("INVALID_SEARCH_QUERY");
      expect((error as AppError).statusCode).toBe(400);
    }
  });
});

describe("matched skills", () => {
  it("returns skills that appear in the query", () => {
    expect(
      matchedSkills(
        ["RAG", "DeepEval", "MCP (Model Context Protocol)", "Java"],
        "agentic QA architect RAG MCP DeepEval"
      )
    ).toEqual(["RAG", "DeepEval", "MCP (Model Context Protocol)"]);
  });
});
