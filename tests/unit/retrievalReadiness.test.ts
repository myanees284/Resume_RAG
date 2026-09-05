import { evaluateReadiness } from "../../src/modules/retrieval/services/RetrievalValidationService";

describe("retrieval readiness", () => {
  const base = {
    collection: "resumes",
    embeddingModel: "mistral-embed",
    embeddingDimension: 1024,
  };

  it("is ready when at least one resume has a matching embedding", () => {
    const result = evaluateReadiness({
      ...base,
      resumeCount: 164,
      resumesWithEmbedding: 164,
    });

    expect(result).toEqual({
      ready: true,
      collection: "resumes",
      resumeCount: 164,
      resumesWithEmbedding: 164,
      embeddingModel: "mistral-embed",
      embeddingDimension: 1024,
    });
  });

  it("is not ready when the collection is empty", () => {
    const result = evaluateReadiness({
      ...base,
      resumeCount: 0,
      resumesWithEmbedding: 0,
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.reason).toBe("No ingested resume embeddings are available");
    }
  });

  it("is not ready when resumes exist but embeddings are missing", () => {
    const result = evaluateReadiness({
      ...base,
      resumeCount: 10,
      resumesWithEmbedding: 0,
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.reason).toBe("No ingested resume embeddings are available");
      expect(result.resumeCount).toBe(10);
      expect(result.resumesWithEmbedding).toBe(0);
    }
  });
});
