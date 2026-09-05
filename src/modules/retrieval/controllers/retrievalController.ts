import { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { EmbeddingService } from "../../../shared/services/EmbeddingService";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { RetrievalValidationService } from "../services/RetrievalValidationService";
import { SearchService } from "../services/SearchService";
import { LLMService } from "../services/LLMService";
import { getQueryEmbeddingInput } from "../utils/queryEmbeddingInput";
import { toResumeSummary } from "../utils/resumeRecord";
import { parseSearchRequest } from "../utils/searchRequest";
import { parseRerankRequest } from "../utils/rerankRequest";
import { parseSummarizeRequest } from "../utils/summarizeRequest";
import { parseEndToEndRequest } from "../utils/endToEndRequest";

export class RetrievalController {
  constructor(
    private readonly validationService = new RetrievalValidationService(),
    private readonly embeddingService = new EmbeddingService(),
    private readonly resumeRepository = new ResumeRepository(),
    private readonly searchService = new SearchService(),
    private readonly llmService = new LLMService()
  ) {}

  async readiness(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const readiness = await this.validationService.checkReadiness();
      res.status(200).json(readiness);
    } catch (error) {
      next(error);
    }
  }

  async embedQuery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = getQueryEmbeddingInput(req.body);
      const embedding = await this.embeddingService.embedText(input);

      res.status(200).json({
        embedding,
        model: env.mistralEmbedModel,
        dimension: embedding.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed"));
    }
  }

  async sampleResume(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const record = await this.resumeRepository.findOneWithEmbedding();

      if (!record) {
        next(
          new AppError(
            404,
            "RESUME_NOT_FOUND",
            "No ingested resume embeddings are available"
          )
        );
        return;
      }

      res.status(200).json({
        success: true,
        resume: toResumeSummary(record),
      });
    } catch (error) {
      next(error);
    }
  }

  async getResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resumeId =
        typeof req.params.resumeId === "string" ? req.params.resumeId : "";
      const record = await this.resumeRepository.findById(resumeId);

      if (!record) {
        next(new AppError(404, "RESUME_NOT_FOUND", "Resume was not found"));
        return;
      }

      res.status(200).json({
        success: true,
        resume: toResumeSummary(record),
      });
    } catch (error) {
      next(error);
    }
  }

  async bm25Search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, topK, filters } = parseSearchRequest(req.body);
      const candidates = await this.searchService.bm25Search(query, filters, topK);

      res.status(200).json({
        mode: "bm25",
        query,
        count: candidates.length,
        results: candidates.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          role: candidate.role,
          score: candidate.bm25Score,
          matchedSkills: candidate.matchedSkills ?? [],
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async vectorSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, topK, filters } = parseSearchRequest(req.body);
      const candidates = await this.searchService.vectorSearch(
        query,
        filters,
        topK
      );

      res.status(200).json({
        mode: "vector",
        query,
        count: candidates.length,
        results: candidates.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          role: candidate.role,
          vectorScore: candidate.vectorScore,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async hybridSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, topK, filters } = parseSearchRequest(req.body);
      const result = await this.searchService.hybridSearch(query, filters, topK);

      res.status(200).json({
        mode: "hybrid-debug",
        query,
        bm25: result.bm25.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          score: candidate.bm25Score,
        })),
        vector: result.vector.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          score: candidate.vectorScore,
        })),
        timings: result.timings,
        degraded: result.degraded,
        warnings: result.warnings,
        vectorFallback: result.vectorFallback,
        bm25Fallback: result.bm25Fallback,
        pool: result.pool.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          sources: candidate.sources,
          bm25Score: candidate.bm25Score,
          vectorScore: candidate.vectorScore,
          snippetChars: candidate.snippet?.length ?? 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async rerank(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, candidates, topK } = parseRerankRequest(req.body);
      const ranked = await this.llmService.rerankCandidates(query, candidates, topK);

      res.status(200).json({
        results: ranked.map((candidate) => ({
          resumeId: candidate.resumeId,
          rank: candidate.rank,
          relevanceScore: candidate.relevanceScore,
          reason: candidate.reason,
        })),
        model: env.groqModel,
      });
    } catch (error) {
      next(error);
    }
  }

  async summarize(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, candidate, options } = parseSummarizeRequest(req.body);
      const summary = await this.llmService.summarizeCandidateFit(
        query,
        candidate,
        options
      );

      res.status(200).json({
        resumeId: candidate.resumeId,
        summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query, filters, options } = parseEndToEndRequest(req.body);
      const result = await this.searchService.endToEndSearch(
        query,
        filters,
        options
      );

      res.locals.searchTimings = result.timings;
      res.locals.searchWarnings = result.warnings;

      res.status(200).json({
        query: result.query,
        results: result.results.map((candidate) => ({
          rank: candidate.rank,
          resumeId: candidate.resumeId,
          name: candidate.name,
          role: candidate.role,
          company: candidate.company,
          totalExperience: candidate.totalExperience ?? null,
          skills: candidate.skills ?? [],
          sources: candidate.sources,
          summary: candidate.summary,
        })),
        degraded: result.degraded,
        warnings: result.warnings,
        vectorFallback: result.vectorFallback,
        bm25Fallback: result.bm25Fallback,
        timings: result.timings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const retrievalController = new RetrievalController();
