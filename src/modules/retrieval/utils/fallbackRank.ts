import { SearchCandidate } from "../types/retrieval.types";

export function fallbackRankCandidates(
  candidates: SearchCandidate[]
): SearchCandidate[] {
  const withBm25 = candidates.filter((candidate) =>
    candidate.sources.includes("bm25")
  );
  const vectorOnly = candidates.filter(
    (candidate) =>
      !candidate.sources.includes("bm25") && candidate.sources.includes("vector")
  );

  return [...withBm25, ...vectorOnly].map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}
