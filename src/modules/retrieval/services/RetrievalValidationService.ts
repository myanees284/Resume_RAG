import { Collection, Document } from "mongodb";
import { connectDatabase, getResumesCollection } from "../../../config/database";
import { env } from "../../../config/env";
import {
  RetrievalReadiness,
  RetrievalReadinessNotReady,
} from "../types/retrieval.types";

export function evaluateReadiness(input: {
  resumeCount: number;
  resumesWithEmbedding: number;
  collection: string;
  embeddingModel: string;
  embeddingDimension: number;
}): RetrievalReadiness {
  if (input.resumeCount <= 0) {
    return notReady("No ingested resume embeddings are available", input);
  }

  if (input.resumesWithEmbedding <= 0) {
    return notReady("No ingested resume embeddings are available", input);
  }

  return {
    ready: true,
    collection: input.collection,
    resumeCount: input.resumeCount,
    resumesWithEmbedding: input.resumesWithEmbedding,
    embeddingModel: input.embeddingModel,
    embeddingDimension: input.embeddingDimension,
  };
}

function notReady(
  reason: string,
  input: {
    collection: string;
    resumeCount: number;
    resumesWithEmbedding: number;
  }
): RetrievalReadinessNotReady {
  return {
    ready: false,
    reason,
    collection: input.collection,
    resumeCount: input.resumeCount,
    resumesWithEmbedding: input.resumesWithEmbedding,
  };
}

export class RetrievalValidationService {
  constructor(
    private readonly getCollection: () => Collection<Document> = () =>
      getResumesCollection()
  ) {}

  async checkReadiness(): Promise<RetrievalReadiness> {
    try {
      await connectDatabase();
      const collection = this.getCollection();
      const resumeCount = await collection.countDocuments();
      const resumesWithEmbedding = await collection.countDocuments({
        embedding: { $exists: true, $type: "array" },
        $expr: {
          $eq: [{ $size: "$embedding" }, env.embeddingDimension],
        },
      });

      return evaluateReadiness({
        resumeCount,
        resumesWithEmbedding,
        collection: env.collectionName,
        embeddingModel: env.mistralEmbedModel,
        embeddingDimension: env.embeddingDimension,
      });
    } catch {
      return {
        ready: false,
        reason: "No ingested resume embeddings are available",
        collection: env.collectionName,
      };
    }
  }
}
