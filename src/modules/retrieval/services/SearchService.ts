import { EmbeddingService } from "../../../shared/services/EmbeddingService";
import { LLMService } from "./LLMService";
import { ResumeRepository } from "../repositories/ResumeRepository";
import {
  EndToEndSearchOptions,
  EndToEndSearchResult,
  HybridSearchResult,
  SearchCandidate,
  SearchFilters,
  StoredResumeRecord,
} from "../types/retrieval.types";
import { fromSearchHit } from "../utils/candidateMapper";
import { cosineSimilarity } from "../utils/cosine";
import { mergeCandidateLists } from "../utils/deduplicate";
import { fallbackRankCandidates } from "../utils/fallbackRank";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";

function hybridLimits(
  topK?: number | { bm25TopK?: number; vectorTopK?: number }
): { bm25TopK: number; vectorTopK: number } {
  if (typeof topK === "number") {
    return { bm25TopK: topK, vectorTopK: topK };
  }

  return {
    bm25TopK: topK?.bm25TopK ?? env.retrievalDefaultTopK,
    vectorTopK: topK?.vectorTopK ?? env.retrievalDefaultTopK,
  };
}

export class SearchService {
  constructor(
    private readonly resumeRepository = new ResumeRepository(),
    private readonly embeddingService = new EmbeddingService(),
    private readonly llmService = new LLMService()
  ) {}

  async bm25Search(
    query: string,
    filters: SearchFilters = {},
    topK?: number
  ): Promise<SearchCandidate[]> {
    const hits = await this.resumeRepository.bm25Search(query, filters, topK);

    return hits.map((hit) =>
      fromSearchHit(hit.record, query, "bm25", { bm25Score: hit.score })
    );
  }

  async vectorSearch(
    query: string,
    filters: SearchFilters = {},
    topK?: number
  ): Promise<SearchCandidate[]> {
    const queryVector = await this.embeddingService.embedText(query);
    const hits = await this.resumeRepository.vectorSearch(
      queryVector,
      filters,
      topK
    );

    return this.toVectorCandidates(query, queryVector, hits);
  }

  async hybridSearch(
    query: string,
    filters: SearchFilters = {},
    topK?: number | { bm25TopK?: number; vectorTopK?: number }
  ): Promise<HybridSearchResult> {
    const limits = hybridLimits(topK);
    const warnings: string[] = [];
    let bm25Fallback = false;
    let vectorFallback = false;

    const bm25StartedAt = Date.now();
    const embeddingStartedAt = Date.now();

    const [bm25Settled, embeddingSettled] = await Promise.allSettled([
      this.bm25Search(query, filters, limits.bm25TopK),
      this.embeddingService.embedText(query),
    ]);

    const bm25Ms = Date.now() - bm25StartedAt;
    const embeddingMs = Date.now() - embeddingStartedAt;

    const bm25Candidates =
      bm25Settled.status === "fulfilled" ? bm25Settled.value : [];
    if (bm25Settled.status === "rejected") {
      bm25Fallback = true;
      warnings.push("BM25_SEARCH_FAILED");
    }

    let vectorCandidates: SearchCandidate[] = [];
    let vectorMs = 0;

    if (embeddingSettled.status === "rejected") {
      vectorFallback = true;
      warnings.push("VECTOR_SEARCH_FAILED");
    } else {
      const vectorStartedAt = Date.now();
      try {
        const vectorHits = await this.resumeRepository.vectorSearch(
          embeddingSettled.value,
          filters,
          limits.vectorTopK
        );
        vectorCandidates = this.toVectorCandidates(
          query,
          embeddingSettled.value,
          vectorHits
        );
      } catch {
        vectorFallback = true;
        warnings.push("VECTOR_SEARCH_FAILED");
      }
      vectorMs = Date.now() - vectorStartedAt;
    }

    const pool = mergeCandidateLists(bm25Candidates, vectorCandidates);
    if (pool.length === 0) {
      throw new AppError(
        503,
        "SEARCH_UNAVAILABLE",
        "No retrieval strategy is currently available"
      );
    }

    return {
      bm25: bm25Candidates,
      vector: vectorCandidates,
      pool,
      degraded: bm25Fallback || vectorFallback,
      warnings,
      vectorFallback,
      bm25Fallback,
      timings: {
        bm25Ms,
        embeddingMs: embeddingSettled.status === "fulfilled" ? embeddingMs : 0,
        vectorMs,
      },
    };
  }

  private toVectorCandidates(
    query: string,
    queryVector: number[],
    hits: Array<{ record: StoredResumeRecord; score: number }>
  ): SearchCandidate[] {
    return hits
      .map((hit) => {
        const vectorScore =
          hit.record.embedding &&
          hit.record.embedding.length === queryVector.length
            ? cosineSimilarity(queryVector, hit.record.embedding)
            : hit.score;

        return fromSearchHit(hit.record, query, "vector", { vectorScore });
      })
      .sort((left, right) => (right.vectorScore ?? 0) - (left.vectorScore ?? 0));
  }

  async endToEndSearch(
    query: string,
    filters: SearchFilters = {},
    options: EndToEndSearchOptions
  ): Promise<EndToEndSearchResult> {
    const startedAt = Date.now();
    const hybrid = await this.hybridSearch(query, filters, {
      bm25TopK: options.bm25TopK,
      vectorTopK: options.vectorTopK,
    });

    let degraded = hybrid.degraded;
    const warnings = [...hybrid.warnings];
    const rerankInput = hybrid.pool.slice(0, options.rerankTopN);
    let ranked: SearchCandidate[] = [];
    const rerankStartedAt = Date.now();

    try {
      ranked = await this.llmService.rerankCandidates(
        query,
        rerankInput,
        options.rerankTopN
      );
    } catch {
      degraded = true;
      warnings.push("LLM_RERANK_FAILED");
      ranked = fallbackRankCandidates(rerankInput);
    }

    const rerankMs = Date.now() - rerankStartedAt;
    ranked = ranked.slice(0, options.finalTopK).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

    let summarizeMs = 0;
    if (options.summarize && ranked.length > 0) {
      const summarizeStartedAt = Date.now();
      ranked = await Promise.all(
        ranked.map(async (candidate) => {
          try {
            const summary = await this.llmService.summarizeCandidateFit(
              query,
              candidate,
              { style: options.summaryStyle }
            );
            return { ...candidate, summary };
          } catch {
            degraded = true;
            if (!warnings.includes("SUMMARIZATION_FAILED")) {
              warnings.push("SUMMARIZATION_FAILED");
            }
            return candidate;
          }
        })
      );
      summarizeMs = Date.now() - summarizeStartedAt;
    }

    return {
      query,
      results: ranked,
      degraded,
      warnings,
      vectorFallback: hybrid.vectorFallback,
      bm25Fallback: hybrid.bm25Fallback,
      timings: {
        embeddingMs: hybrid.timings.embeddingMs,
        bm25Ms: hybrid.timings.bm25Ms,
        vectorMs: hybrid.timings.vectorMs,
        rerankMs,
        summarizeMs,
        totalMs: Date.now() - startedAt,
      },
    };
  }
}
