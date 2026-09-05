import { connectDatabase, getResumesCollection } from "../../../config/database";
import { AppError } from "../../../middleware/errorHandler";
import { StoredResume } from "../types/ingestion.types";

export function toResumeDocument(resume: StoredResume, now = new Date()) {
  return {
    fileName: resume.fileName,
    sourcePath: resume.sourcePath ?? null,
    contentHash: resume.contentHash ?? null,
    rawText: resume.rawText,
    name: resume.name ?? null,
    email: resume.email ?? null,
    phone: resume.phone ?? null,
    location: resume.location ?? null,
    company: resume.company ?? null,
    role: resume.role ?? null,
    education: resume.education ?? null,
    totalExperience: resume.totalExperience ?? null,
    relevantExperience: resume.relevantExperience ?? null,
    skills: resume.skills ?? [],
    jobTitles: resume.jobTitles ?? [],
    experienceSummary: resume.experienceSummary ?? null,
    embedding: resume.embedding,
    embeddingModel: resume.embeddingModel,
    embeddingDimension: resume.embeddingDimension,
    updatedAt: now,
  };
}

export class ResumeIngestionRepository {
  async ensureIndexes(): Promise<void> {
    await connectDatabase();
    const collection = getResumesCollection();
    await collection.createIndex(
      { contentHash: 1 },
      { unique: true, sparse: true }
    );
    await collection.createIndex(
      { sourcePath: 1 },
      { unique: true, sparse: true }
    );
  }

  async findIdByContentHash(contentHash: string): Promise<string | null> {
    await connectDatabase();
    const existing = await getResumesCollection().findOne({ contentHash });
    return existing ? String(existing._id) : null;
  }

  async insert(resume: StoredResume): Promise<string> {
    try {
      await connectDatabase();
      const collection = getResumesCollection();
      const now = new Date();
      const document = toResumeDocument(resume, now);

      const existing =
        (resume.contentHash
          ? await collection.findOne({ contentHash: resume.contentHash })
          : null) ??
        (resume.sourcePath
          ? await collection.findOne({ sourcePath: resume.sourcePath })
          : null) ??
        (resume.fileName
          ? await collection.findOne({ fileName: resume.fileName })
          : null);

      if (existing) {
        await collection.updateOne({ _id: existing._id }, { $set: document });
        return String(existing._id);
      }

      const result = await collection.insertOne({
        ...document,
        createdAt: now,
      });

      return String(result.insertedId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(503, "INGESTION_FAILED", "Resume ingestion failed");
    }
  }
}
