import {
  cosineSimilarity,
  exactRescore,
} from "../../src/modules/retrieval/utils/cosine";

describe("vector exact re-score", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("reorders ANN hits by exact cosine", () => {
    const query = [1, 0];
    const order = exactRescore(
      [
        { embedding: [0, 1], score: 0.9 },
        { embedding: [1, 0], score: 0.1 },
      ],
      query
    );

    expect(order).toEqual([1, 0]);
  });
});
