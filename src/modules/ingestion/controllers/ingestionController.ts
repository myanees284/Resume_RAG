import fs from "fs/promises";
import { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env";
import { detectSkills } from "../../../config/skills";
import { AppError } from "../../../middleware/errorHandler";
import { ResumeParserService } from "../services/ResumeParserService";
import {
  EmbeddingService,
  buildEmbeddingText,
  validateEmbedding,
} from "../services/EmbeddingService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { ResumeIngestionService } from "../services/ResumeIngestionService";
import { cleanResumeText } from "../utils/textCleaner";
import { hashFile } from "../utils/fileHash";

export class IngestionController {
  constructor(
    private readonly parserService = new ResumeParserService(),
    private readonly embeddingService = new EmbeddingService(),
    private readonly ingestionRepository = new ResumeIngestionRepository(),
    private readonly ingestionService = new ResumeIngestionService()
  ) {}

  health(_req: Request, res: Response): void {
    res.status(200).json({
      status: "ok",
      module: "resume-ingestion",
    });
  }

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    const file = req.file;

    if (!file) {
      next(new AppError(400, "FILE_REQUIRED", "Resume PDF is required"));
      return;
    }

    try {
      res.status(200).json({
        success: true,
        message: "Resume uploaded successfully",
        file: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      });
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }

  async extract(req: Request, res: Response, next: NextFunction): Promise<void> {
    const file = req.file;

    if (!file) {
      next(new AppError(400, "FILE_REQUIRED", "Resume PDF is required"));
      return;
    }

    try {
      const rawText = await this.parserService.extractTextFromPdf(file.path);

      if (!rawText) {
        throw new AppError(
          422,
          "RESUME_EXTRACTION_FAILED",
          "Resume extraction failed"
        );
      }

      res.status(200).json({
        success: true,
        rawText,
        characters: rawText.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(
        new AppError(
          422,
          "RESUME_EXTRACTION_FAILED",
          "Resume extraction failed"
        )
      );
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }

  clean(req: Request, res: Response, next: NextFunction): void {
    const rawText = req.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim() === "") {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    res.status(200).json({
      success: true,
      cleanText: cleanResumeText(rawText),
    });
  }

  skills(req: Request, res: Response, next: NextFunction): void {
    const rawText = req.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim() === "") {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    res.status(200).json({
      success: true,
      skills: detectSkills(rawText),
    });
  }

  parse(req: Request, res: Response, next: NextFunction): void {
    const rawText = req.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim() === "") {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    try {
      const resume = this.parserService.parseResume(cleanResumeText(rawText));
      res.status(200).json({
        success: true,
        resume,
      });
    } catch {
      next(
        new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed")
      );
    }
  }

  async llmParse(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!env.useLlmParser) {
      next(
        new AppError(
          403,
          "LLM_PARSER_DISABLED",
          "LLM resume parser is disabled"
        )
      );
      return;
    }

    const rawText = req.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim() === "") {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    try {
      const resume = await this.parserService.parseResumeWithLlm(
        cleanResumeText(rawText)
      );
      res.status(200).json({
        success: true,
        resume,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(
        new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed")
      );
    }
  }

  async embed(req: Request, res: Response, next: NextFunction): Promise<void> {
    const name = typeof req.body?.name === "string" ? req.body.name : undefined;
    const role = typeof req.body?.role === "string" ? req.body.role : undefined;
    const company =
      typeof req.body?.company === "string" ? req.body.company : undefined;
    const experienceSummary =
      typeof req.body?.experienceSummary === "string"
        ? req.body.experienceSummary
        : undefined;
    const rawText =
      typeof req.body?.rawText === "string" ? req.body.rawText : undefined;
    const skills = Array.isArray(req.body?.skills)
      ? req.body.skills.filter((skill: unknown): skill is string => typeof skill === "string")
      : undefined;

    const embeddingText = buildEmbeddingText({
      name,
      role,
      skills,
      company,
      experienceSummary,
      rawText,
    });

    if (!embeddingText) {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    try {
      const embedding = await this.embeddingService.embedText(embeddingText);
      res.status(200).json({
        success: true,
        model: env.mistralEmbedModel,
        dimension: embedding.length,
        embedding,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed"));
    }
  }

  async store(req: Request, res: Response, next: NextFunction): Promise<void> {
    const fileName =
      typeof req.body?.fileName === "string" && req.body.fileName.trim() !== ""
        ? req.body.fileName.trim()
        : "resume.pdf";
    const rawText =
      typeof req.body?.rawText === "string" ? req.body.rawText.trim() : "";
    const resume =
      req.body?.resume && typeof req.body.resume === "object"
        ? req.body.resume
        : {};

    if (!rawText) {
      next(new AppError(400, "FILE_REQUIRED", "Resume text is required"));
      return;
    }

    try {
      const embedding = validateEmbedding(req.body?.embedding);
      const skills = Array.isArray(resume.skills)
        ? resume.skills.filter((skill: unknown): skill is string => typeof skill === "string")
        : [];

      const resumeId = await this.ingestionRepository.insert({
        fileName,
        rawText,
        name: typeof resume.name === "string" ? resume.name : undefined,
        email: typeof resume.email === "string" ? resume.email : undefined,
        phone: typeof resume.phone === "string" ? resume.phone : undefined,
        location: typeof resume.location === "string" ? resume.location : undefined,
        company: typeof resume.company === "string" ? resume.company : undefined,
        role: typeof resume.role === "string" ? resume.role : undefined,
        education:
          typeof resume.education === "string" ? resume.education : undefined,
        totalExperience:
          typeof resume.totalExperience === "number"
            ? resume.totalExperience
            : undefined,
        relevantExperience:
          typeof resume.relevantExperience === "number"
            ? resume.relevantExperience
            : undefined,
        skills,
        jobTitles: Array.isArray(resume.jobTitles)
          ? resume.jobTitles.filter(
              (title: unknown): title is string => typeof title === "string"
            )
          : undefined,
        experienceSummary:
          typeof resume.experienceSummary === "string"
            ? resume.experienceSummary
            : undefined,
        embedding,
        embeddingModel: env.mistralEmbedModel,
        embeddingDimension: embedding.length,
      });

      res.status(200).json({
        success: true,
        message: "Resume stored successfully",
        resumeId,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(503, "INGESTION_FAILED", "Resume ingestion failed"));
    }
  }

  async ingestResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    const file = req.file;

    if (!file) {
      next(new AppError(400, "FILE_REQUIRED", "Resume PDF is required"));
      return;
    }

    try {
      const result = await this.ingestionService.ingestResume({
        originalname: file.originalname,
        path: file.path,
        contentHash: await hashFile(file.path),
      });
      res.locals.fileName = file.originalname;
      res.locals.ingestTimings = result.timings;
      res.status(200).json({
        success: true,
        message: "Resume ingestion completed",
        resumeId: result.resumeId,
        data: result.data,
        timings: result.timings,
      });
    } catch (error) {
      res.locals.fileName = file.originalname;
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(503, "INGESTION_FAILED", "Resume ingestion failed"));
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }
}

export const ingestionController = new IngestionController();
