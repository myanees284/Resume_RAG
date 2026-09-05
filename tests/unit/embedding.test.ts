import { validateEmbedding } from "../../src/modules/ingestion/services/EmbeddingService";
import { AppError } from "../../src/middleware/errorHandler";

describe("embedding validation", () => {
  it("accepts a 1024-dimension numeric vector", () => {
    const vector = Array.from({ length: 1024 }, (_, index) => index * 0.001);
    expect(validateEmbedding(vector)).toHaveLength(1024);
  });

  it("rejects the wrong dimension", () => {
    expect(() => validateEmbedding([0.1, 0.2])).toThrow(AppError);
  });
});
