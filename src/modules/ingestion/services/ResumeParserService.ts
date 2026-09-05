import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { ParsedResume } from "../types/ingestion.types";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";
import { LLMResumeParser } from "./LLMResumeParser";

export class ResumeParserService {
  constructor(
    private readonly algorithmParser = new AlgorithmResumeParser(),
    private readonly llmParser = new LLMResumeParser()
  ) {}

  async extractTextFromPdf(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });

    try {
      const result = await parser.getText();
      return (result.text ?? "").trim();
    } catch {
      throw new AppError(
        422,
        "RESUME_EXTRACTION_FAILED",
        "Resume extraction failed"
      );
    } finally {
      await parser.destroy();
    }
  }

  parseResume(rawText: string): ParsedResume {
    return this.algorithmParser.parseResume(rawText);
  }

  async parseResumeForIngestion(rawText: string): Promise<ParsedResume> {
    if (env.useLlmParser) {
      return this.llmParser.parseResume(rawText);
    }

    return this.algorithmParser.parseResume(rawText);
  }

  async parseResumeWithLlm(rawText: string): Promise<ParsedResume> {
    return this.llmParser.parseResume(rawText);
  }
}
