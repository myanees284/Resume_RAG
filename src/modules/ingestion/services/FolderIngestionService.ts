import fs from "fs/promises";
import path from "path";
import { AppError } from "../../../middleware/errorHandler";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { hashFile } from "../utils/fileHash";
import { ResumeIngestionService } from "./ResumeIngestionService";

export type FolderIngestStatus = "ingested" | "skipped" | "failed" | "ignored";

export interface FolderIngestRecord {
  file: string;
  status: FolderIngestStatus;
  resumeId?: string;
  errorCode?: string;
  message?: string;
  totalMs?: number;
}

export interface FolderIngestReport {
  folder: string;
  startedAt: string;
  finishedAt: string;
  totals: {
    pdfs: number;
    ignoredNonPdf: number;
    ingested: number;
    skipped: number;
    failed: number;
    concurrency: number;
  };
  results: FolderIngestRecord[];
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export class FolderIngestionService {
  constructor(
    private readonly ingestionService = new ResumeIngestionService(),
    private readonly repository = new ResumeIngestionRepository()
  ) {}

  async ingestFolder(options: {
    folder: string;
    limit?: number;
    concurrency?: number;
  }): Promise<FolderIngestReport> {
    const folder = path.resolve(options.folder);
    const startedAt = new Date().toISOString();
    const concurrency = Math.max(1, options.concurrency ?? 5);
    await this.repository.ensureIndexes();

    const allFiles = await listFilesRecursive(folder);
    const pdfs = allFiles.filter((file) => path.extname(file).toLowerCase() === ".pdf");
    const ignoredNonPdf = allFiles.length - pdfs.length;
    const selected = options.limit ? pdfs.slice(0, options.limit) : pdfs;

    const results: FolderIngestRecord[] = allFiles
      .filter((file) => path.extname(file).toLowerCase() !== ".pdf")
      .map((file) => ({
        file: path.relative(folder, file),
        status: "ignored" as const,
        message: "Not a PDF",
      }));

    const pdfResults = await mapWithConcurrency(
      selected,
      concurrency,
      async (filePath) => {
        const relativePath = path.relative(folder, filePath);
        const fileStartedAt = Date.now();

        try {
          const contentHash = await hashFile(filePath);
          const existingId = await this.repository.findIdByContentHash(contentHash);

          if (existingId) {
            return {
              file: relativePath,
              status: "skipped" as const,
              resumeId: existingId,
              message: "Identical content already stored",
              totalMs: Date.now() - fileStartedAt,
            };
          }

          const ingested = await this.ingestionService.ingestResume({
            originalname: path.basename(filePath),
            path: filePath,
            sourcePath: relativePath,
            contentHash,
          });

          return {
            file: relativePath,
            status: "ingested" as const,
            resumeId: ingested.resumeId,
            totalMs: ingested.timings.totalMs,
          };
        } catch (error) {
          return {
            file: relativePath,
            status: "failed" as const,
            errorCode: error instanceof AppError ? error.errorCode : "INGESTION_FAILED",
            message: error instanceof Error ? error.message : "Resume ingestion failed",
            totalMs: Date.now() - fileStartedAt,
          };
        }
      }
    );

    results.push(...pdfResults);

    const notProcessed =
      options.limit && pdfs.length > selected.length
        ? pdfs.slice(selected.length).map((file) => ({
            file: path.relative(folder, file),
            status: "ignored" as const,
            message: "Beyond limit",
          }))
        : [];

    const report: FolderIngestReport = {
      folder,
      startedAt,
      finishedAt: new Date().toISOString(),
      totals: {
        pdfs: pdfs.length,
        ignoredNonPdf,
        ingested: results.filter((row) => row.status === "ingested").length,
        skipped: results.filter((row) => row.status === "skipped").length,
        failed: results.filter((row) => row.status === "failed").length,
        concurrency,
      },
      results: [...results, ...notProcessed],
    };

    return report;
  }
}
