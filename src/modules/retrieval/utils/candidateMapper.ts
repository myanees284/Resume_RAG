import { SearchCandidate, SearchSource, StoredResumeRecord } from "../types/retrieval.types";
import { matchedSkills } from "./matchedSkills";
import { buildCandidateSnippet } from "./resumeRecord";

export const SEARCH_CANDIDATE_KEYS = [
  "resumeId",
  "name",
  "role",
  "company",
  "skills",
  "snippet",
  "matchedSkills",
  "totalExperience",
  "bm25Score",
  "vectorScore",
  "sources",
] as const;

export function toSearchCandidate(input: {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills?: string[];
  snippet?: string;
  matchedSkills?: string[];
  totalExperience?: number | null;
  bm25Score?: number;
  vectorScore?: number;
  source: SearchSource;
}): SearchCandidate {
  return {
    resumeId: input.resumeId,
    name: input.name,
    role: input.role,
    company: input.company,
    skills: input.skills,
    snippet: input.snippet,
    matchedSkills: input.matchedSkills,
    totalExperience: input.totalExperience,
    bm25Score: input.bm25Score,
    vectorScore: input.vectorScore,
    sources: [input.source],
  };
}

export function fromSearchHit(
  record: StoredResumeRecord,
  query: string,
  source: SearchSource,
  scores: { bm25Score?: number; vectorScore?: number }
): SearchCandidate {
  return toSearchCandidate({
    resumeId: record._id,
    name: record.name,
    role: record.role,
    company: record.company,
    skills: record.skills,
    snippet: buildCandidateSnippet(record),
    matchedSkills: matchedSkills(record.skills, query),
    totalExperience: record.totalExperience,
    bm25Score: scores.bm25Score,
    vectorScore: scores.vectorScore,
    source,
  });
}

export function isNormalizedCandidate(candidate: SearchCandidate): boolean {
  return (
    typeof candidate.resumeId === "string" &&
    candidate.resumeId.length > 0 &&
    Array.isArray(candidate.sources) &&
    candidate.sources.length > 0 &&
    SEARCH_CANDIDATE_KEYS.every((key) => key in candidate)
  );
}

