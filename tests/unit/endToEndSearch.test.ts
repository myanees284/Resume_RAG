import { fallbackRankCandidates } from "../../src/modules/retrieval/utils/fallbackRank";
import { parseEndToEndRequest } from "../../src/modules/retrieval/utils/endToEndRequest";
import { toSearchCandidate } from "../../src/modules/retrieval/utils/candidateMapper";

describe("end-to-end request parsing", () => {
  it("reads search options with defaults", () => {
    const parsed = parseEndToEndRequest({
      query: "Senior agentic QA architect with RAG",
      options: { summarize: true, finalTopK: 5 },
    });

    expect(parsed.options.summarize).toBe(true);
    expect(parsed.options.finalTopK).toBe(5);
    expect(parsed.options.summaryStyle).toBe("short");
  });
});

describe("fallback ranking", () => {
  it("puts BM25 hits before vector-only hits", () => {
    const ranked = fallbackRankCandidates([
      toSearchCandidate({ resumeId: "v", source: "vector" }),
      toSearchCandidate({ resumeId: "b", source: "bm25" }),
    ]);

    expect(ranked.map((candidate) => candidate.resumeId)).toEqual(["b", "v"]);
    expect(ranked[0].rank).toBe(1);
  });
});
