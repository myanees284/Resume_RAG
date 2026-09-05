import { SearchCandidate } from "../types/retrieval.types";
import { SNIPPET_MAX_CHARS } from "./resumeRecord";

function uniqueSources(sources: SearchCandidate["sources"]): SearchCandidate["sources"] {
  return [...new Set(sources)];
}

function capSnippet(snippet?: string): string | undefined {
  if (!snippet) {
    return snippet;
  }

  return snippet.slice(0, SNIPPET_MAX_CHARS);
}

function mergeTwo(
  current: SearchCandidate,
  incoming: SearchCandidate
): SearchCandidate {
  return {
    resumeId: current.resumeId,
    name: current.name ?? incoming.name,
    role: current.role ?? incoming.role,
    company: current.company ?? incoming.company,
    skills: current.skills?.length ? current.skills : incoming.skills,
    snippet: capSnippet(current.snippet || incoming.snippet),
    matchedSkills: [
      ...new Set([
        ...(current.matchedSkills ?? []),
        ...(incoming.matchedSkills ?? []),
      ]),
    ],
    totalExperience: current.totalExperience ?? incoming.totalExperience,
    bm25Score: current.bm25Score ?? incoming.bm25Score,
    vectorScore: current.vectorScore ?? incoming.vectorScore,
    sources: uniqueSources([...current.sources, ...incoming.sources]),
  };
}

export function deduplicateCandidates(
  candidates: SearchCandidate[]
): SearchCandidate[] {
  const byResumeId = new Map<string, SearchCandidate>();

  for (const candidate of candidates) {
    const existing = byResumeId.get(candidate.resumeId);
    if (!existing) {
      byResumeId.set(candidate.resumeId, {
        ...candidate,
        snippet: capSnippet(candidate.snippet),
        sources: uniqueSources(candidate.sources),
      });
      continue;
    }

    byResumeId.set(candidate.resumeId, mergeTwo(existing, candidate));
  }

  return [...byResumeId.values()];
}

export function mergeCandidateLists(
  bm25: SearchCandidate[],
  vector: SearchCandidate[]
): SearchCandidate[] {
  return deduplicateCandidates([...bm25, ...vector]);
}
