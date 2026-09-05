import { env } from "../../src/config/env";
import { AppError } from "../../src/middleware/errorHandler";
import { getQueryEmbeddingInput } from "../../src/modules/retrieval/utils/queryEmbeddingInput";

describe("query embedding input", () => {
  it("trims a valid recruiter query", () => {
    expect(
      getQueryEmbeddingInput({
        model: env.mistralEmbedModel,
        input: "  senior agentic QA architect with RAG  ",
      })
    ).toBe("senior agentic QA architect with RAG");
  });

  it("rejects an empty query", () => {
    expect(() => getQueryEmbeddingInput({ input: "   " })).toThrow(AppError);
    try {
      getQueryEmbeddingInput({ input: "" });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCode).toBe("INVALID_EMBEDDING_INPUT");
    }
  });

  it("rejects a model that is not the ingestion embedding model", () => {
    try {
      getQueryEmbeddingInput({
        model: "other-model",
        input: "RAG DeepEval MCP",
      });
      throw new Error("expected AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCode).toBe("INVALID_EMBEDDING_MODEL");
    }
  });
});
