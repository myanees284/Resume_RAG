import { Document, ObjectId } from "mongodb";
import { connectDatabase, getResumesCollection } from "../../../config/database";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { SearchFilters, StoredResumeRecord } from "../types/retrieval.types";
import { experienceFilterQuery } from "../utils/resumeRecord";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function toStoredResumeRecord(document: Document | null): StoredResumeRecord | null {
  if (!document) {
    return null;
  }

  const embedding = Array.isArray(document.embedding)
    ? document.embedding.filter((value: unknown): value is number => typeof value === "number")
    : undefined;

  return {
    _id: String(document._id),
    fileName: typeof document.fileName === "string" ? document.fileName : undefined,
    rawText: typeof document.rawText === "string" ? document.rawText : undefined,
    name: typeof document.name === "string" ? document.name : undefined,
    email: typeof document.email === "string" ? document.email : undefined,
    phone: typeof document.phone === "string" ? document.phone : undefined,
    location: typeof document.location === "string" ? document.location : undefined,
    company: typeof document.company === "string" ? document.company : undefined,
    role: typeof document.role === "string" ? document.role : undefined,
    education: typeof document.education === "string" ? document.education : undefined,
    totalExperience:
      typeof document.totalExperience === "number" ? document.totalExperience : null,
    relevantExperience:
      typeof document.relevantExperience === "number"
        ? document.relevantExperience
        : null,
    skills: asStringArray(document.skills),
    jobTitles: asStringArray(document.jobTitles),
    experienceSummary:
      typeof document.experienceSummary === "string"
        ? document.experienceSummary
        : null,
    embedding,
    embeddingModel:
      typeof document.embeddingModel === "string" ? document.embeddingModel : undefined,
    embeddingDimension:
      typeof document.embeddingDimension === "number"
        ? document.embeddingDimension
        : embedding?.length,
  };
}

export class ResumeRepository {
  async findById(resumeId: string): Promise<StoredResumeRecord | null> {
    if (!ObjectId.isValid(resumeId)) {
      return null;
    }

    await connectDatabase();
    const document = await getResumesCollection().findOne({
      _id: new ObjectId(resumeId),
    });

    return toStoredResumeRecord(document);
  }

  async findByIds(resumeIds: string[]): Promise<StoredResumeRecord[]> {
    const objectIds = resumeIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (objectIds.length === 0) {
      return [];
    }

    await connectDatabase();
    const documents = await getResumesCollection()
      .find({ _id: { $in: objectIds } })
      .toArray();

    return documents
      .map((document) => toStoredResumeRecord(document))
      .filter((record): record is StoredResumeRecord => record !== null);
  }

  async findOneWithEmbedding(
    minYearsExperience?: number
  ): Promise<StoredResumeRecord | null> {
    await connectDatabase();
    const document = await getResumesCollection().findOne({
      embedding: { $exists: true, $type: "array" },
      ...experienceFilterQuery(minYearsExperience),
    });

    return toStoredResumeRecord(document);
  }

  async bm25Search(
    query: string,
    filters: SearchFilters = {},
    topK = env.retrievalDefaultTopK
  ): Promise<Array<{ record: StoredResumeRecord; score: number }>> {
    await connectDatabase();

    const searchClause: Record<string, unknown> = {
      index: env.bm25IndexName,
      compound: {
        must: [
          {
            text: {
              query,
              path: [
                "rawText",
                "skills",
                "jobTitles",
                "experienceSummary",
                "role",
                "company",
              ],
            },
          },
        ],
      },
    };

    if (filters.minYearsExperience !== undefined) {
      (searchClause.compound as { filter?: unknown[] }).filter = [
        {
          range: {
            path: "totalExperience",
            gte: filters.minYearsExperience,
          },
        },
      ];
    }

    try {
      const documents = await getResumesCollection()
        .aggregate<Document>([
          { $search: searchClause },
          { $limit: topK },
          {
            $project: {
              name: 1,
              role: 1,
              company: 1,
              skills: 1,
              jobTitles: 1,
              experienceSummary: 1,
              rawText: 1,
              totalExperience: 1,
              score: { $meta: "searchScore" },
            },
          },
        ])
        .toArray();

      return documents
        .map((document) => {
          const record = toStoredResumeRecord(document);
          const score =
            typeof document.score === "number" ? document.score : 0;
          return record ? { record, score } : null;
        })
        .filter(
          (hit): hit is { record: StoredResumeRecord; score: number } =>
            hit !== null
        );
    } catch {
      throw new AppError(502, "BM25_SEARCH_FAILED", "BM25 search failed");
    }
  }

  async vectorSearch(
    queryVector: number[],
    filters: SearchFilters = {},
    topK = env.retrievalDefaultTopK
  ): Promise<Array<{ record: StoredResumeRecord; score: number }>> {
    await connectDatabase();

    const vectorSearch: Record<string, unknown> = {
      index: env.vectorIndexName,
      path: "embedding",
      queryVector,
      numCandidates: Math.min(Math.max(topK * 20, 100), 10000),
      limit: topK,
    };

    if (filters.minYearsExperience !== undefined) {
      vectorSearch.filter = {
        totalExperience: { $gte: filters.minYearsExperience },
      };
    }

    try {
      const documents = await getResumesCollection()
        .aggregate<Document>([
          { $vectorSearch: vectorSearch },
          {
            $project: {
              name: 1,
              role: 1,
              company: 1,
              skills: 1,
              jobTitles: 1,
              experienceSummary: 1,
              rawText: 1,
              totalExperience: 1,
              embedding: 1,
              score: { $meta: "vectorSearchScore" },
            },
          },
        ])
        .toArray();

      return documents
        .map((document) => {
          const record = toStoredResumeRecord(document);
          const score =
            typeof document.score === "number" ? document.score : 0;
          return record ? { record, score } : null;
        })
        .filter(
          (hit): hit is { record: StoredResumeRecord; score: number } =>
            hit !== null
        );
    } catch {
      throw new AppError(502, "VECTOR_SEARCH_FAILED", "Vector search failed");
    }
  }
}
