export interface RetrievalReadinessReady {
  ready: true;
  collection: string;
  resumeCount: number;
  resumesWithEmbedding: number;
  embeddingModel: string;
  embeddingDimension: number;
}

export interface RetrievalReadinessNotReady {
  ready: false;
  reason: string;
  collection?: string;
  resumeCount?: number;
  resumesWithEmbedding?: number;
}

export type RetrievalReadiness = RetrievalReadinessReady | RetrievalReadinessNotReady;

export type SearchSource = "bm25" | "vector";

export interface SearchCandidate {
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
  sources: SearchSource[];
  rank?: number;
  relevanceScore?: number;
  reason?: string;
  summary?: string;
}

export interface SearchFilters {
  minYearsExperience?: number;
}

export interface EndToEndSearchOptions {
  bm25TopK: number;
  vectorTopK: number;
  rerankTopN: number;
  finalTopK: number;
  summarize: boolean;
  summaryStyle: "short" | "detailed";
}

export interface EndToEndSearchResult {
  query: string;
  results: SearchCandidate[];
  degraded: boolean;
  warnings: string[];
  vectorFallback?: boolean;
  bm25Fallback?: boolean;
  timings: {
    embeddingMs: number;
    bm25Ms: number;
    vectorMs: number;
    rerankMs: number;
    summarizeMs: number;
    totalMs: number;
  };
}

export interface HybridSearchResult {
  bm25: SearchCandidate[];
  vector: SearchCandidate[];
  pool: SearchCandidate[];
  degraded: boolean;
  warnings: string[];
  vectorFallback: boolean;
  bm25Fallback: boolean;
  timings: {
    bm25Ms: number;
    embeddingMs: number;
    vectorMs: number;
  };
}

export interface StoredResumeRecord {
  _id: string;
  fileName?: string;
  rawText?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  role?: string;
  education?: string;
  totalExperience?: number | null;
  relevantExperience?: number | null;
  skills: string[];
  jobTitles: string[];
  experienceSummary?: string | null;
  embedding?: number[];
  embeddingModel?: string;
  embeddingDimension?: number;
}

export interface ResumeSummary {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  totalExperience?: number | null;
  skills: string[];
  embeddingModel?: string;
  embeddingDimension?: number;
  hasEmbedding: boolean;
  snippet: string;
}
