import { ObjectId } from "mongodb";
import { toSearchCandidate } from "../../src/modules/retrieval/utils/candidateMapper";
import { deduplicateCandidates } from "../../src/modules/retrieval/utils/deduplicate";

describe("retrieval module scaffold", () => {
  it("maps a resume document into a normalized candidate", () => {
    const candidate = toSearchCandidate({
      resumeId: new ObjectId().toHexString(),
      name: "Rajesh Mohan Kumar",
      role: "Test Architect",
      source: "bm25",
      bm25Score: 8.41,
    });

    expect(candidate.sources).toEqual(["bm25"]);
    expect(candidate.name).toBe("Rajesh Mohan Kumar");
    expect(candidate.bm25Score).toBe(8.41);
  });

  it("merges duplicate resumeIds and keeps source provenance", () => {
    const first = toSearchCandidate({
      resumeId: "a",
      source: "bm25",
    });
    const second = toSearchCandidate({
      resumeId: "a",
      source: "vector",
    });

    const merged = deduplicateCandidates([first, second]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toEqual(["bm25", "vector"]);
  });
});
