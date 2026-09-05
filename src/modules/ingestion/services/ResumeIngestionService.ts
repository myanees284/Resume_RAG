import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanResumeText } from "../utils/textCleaner";
import {
  EmbeddingService,
  buildEmbeddingText,
} from "./EmbeddingService";
import { ResumeParserService } from "./ResumeParserService";

export interface IngestResumeResult {
  resumeId: string;
  data: {
    name?: string;
    role?: string;
    company?: string;
    totalExperience?: number;
    skillsCount: number;
    embeddingModel: string;
    embeddingDimension: number;
  };
  timings: {
    extractMs: number;
    cleanMs: number;
    parseMs: number;
    embeddingMs: number;
    mongoInsertMs: number;
    totalMs: number;
  };
}

function elapsed(startedAt: number): number {
  return Date.now() - startedAt;
}

export class ResumeIngestionService {
  constructor(
    private readonly parserService = new ResumeParserService(),
    private readonly embeddingService = new EmbeddingService(),
    private readonly ingestionRepository = new ResumeIngestionRepository()
  ) {}

  async ingestResume(file: {
    originalname: string;
    path: string;
    sourcePath?: string;
    contentHash?: string;
  }): Promise<IngestResumeResult> {
    const totalStartedAt = Date.now();

    const extractStartedAt = Date.now();
    const extractedText = await this.parserService.extractTextFromPdf(file.path);
    const extractMs = elapsed(extractStartedAt);

    if (!extractedText) {
      throw new AppError(
        422,
        "RESUME_EXTRACTION_FAILED",
        "Resume extraction failed"
      );
    }

    const cleanStartedAt = Date.now();
    const rawText = cleanResumeText(extractedText);
    const cleanMs = elapsed(cleanStartedAt);

    const parseStartedAt = Date.now();
    const resume = await this.parserService.parseResumeForIngestion(rawText);
    const parseMs = elapsed(parseStartedAt);

    const embeddingStartedAt = Date.now();
    const embedding = await this.embeddingService.embedText(
      buildEmbeddingText({
        name: resume.name,
        role: resume.role,
        skills: resume.skills,
        company: resume.company,
        experienceSummary: resume.experienceSummary,
        rawText,
      })
    );
    const embeddingMs = elapsed(embeddingStartedAt);

    const mongoStartedAt = Date.now();
    const resumeId = await this.ingestionRepository.insert({
      fileName: file.originalname,
      sourcePath: file.sourcePath,
      contentHash: file.contentHash,
      rawText,
      ...resume,
      embedding,
      embeddingModel: env.mistralEmbedModel,
      embeddingDimension: embedding.length,
    });
    const mongoInsertMs = elapsed(mongoStartedAt);

    return {
      resumeId,
      data: {
        ...(resume.name ? { name: resume.name } : {}),
        ...(resume.role ? { role: resume.role } : {}),
        ...(resume.company ? { company: resume.company } : {}),
        ...(resume.totalExperience !== undefined
          ? { totalExperience: resume.totalExperience }
          : {}),
        skillsCount: resume.skills.length,
        embeddingModel: env.mistralEmbedModel,
        embeddingDimension: embedding.length,
      },
      timings: {
        extractMs,
        cleanMs,
        parseMs,
        embeddingMs,
        mongoInsertMs,
        totalMs: elapsed(totalStartedAt),
      },
    };
  }
}
