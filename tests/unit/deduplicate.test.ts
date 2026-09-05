import { SNIPPET_MAX_CHARS } from "../../src/modules/retrieval/utils/resumeRecord";
import { toSearchCandidate } from "../../src/modules/retrieval/utils/candidateMapper";
import { mergeCandidateLists } from "../../src/modules/retrieval/utils/deduplicate";

describe("candidate merge and dedupe", () => {
  it("merges BM25 A,B,C with vector B,D,A into A,B,C,D", () => {
    const bm25 = ["A", "B", "C"].map((resumeId) =>
      toSearchCandidate({ resumeId, source: "bm25", bm25Score: 1 })
    );
    const vector = ["B", "D", "A"].map((resumeId) =>
      toSearchCandidate({ resumeId, source: "vector", vectorScore: 0.8 })
    );

    const pool = mergeCandidateLists(bm25, vector);

    expect(pool.map((candidate) => candidate.resumeId)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(pool.find((candidate) => candidate.resumeId === "A")?.sources).toEqual(
      ["bm25", "vector"]
    );
    expect(pool.find((candidate) => candidate.resumeId === "D")?.sources).toEqual(
      ["vector"]
    );
    expect(pool.find((candidate) => candidate.resumeId === "C")?.bm25Score).toBe(
      1
    );
    expect(
      pool.find((candidate) => candidate.resumeId === "B")?.vectorScore
    ).toBe(0.8);
  });

  it("caps snippets before they would be sent to an LLM", () => {
    const pool = mergeCandidateLists(
      [
        toSearchCandidate({
          resumeId: "A",
          source: "bm25",
          snippet: "x".repeat(5000),
        }),
      ],
      []
    );

    expect(pool[0].snippet?.length).toBe(SNIPPET_MAX_CHARS);
  });
});
