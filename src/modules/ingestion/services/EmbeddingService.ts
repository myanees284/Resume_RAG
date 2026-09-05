import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";

export function buildEmbeddingText(input: {
  name?: string;
  role?: string;
  skills?: string[];
  company?: string;
  experienceSummary?: string;
  rawText?: string;
}): string {
  return [
    input.name ?? "",
    input.role ?? "",
    (input.skills ?? []).join(", "),
    input.company ?? "",
    input.experienceSummary ?? "",
    input.rawText ?? "",
  ]
    .join("\n")
    .trim();
}

export function validateEmbedding(vector: unknown): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }

  if (vector.length !== env.embeddingDimension) {
    throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }

  if (!vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }

  return vector;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryWaitMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 30000);
    }
  }

  return Math.min(1000 * 2 ** attempt, 16000);
}

export class EmbeddingService {
  async embedText(text: string): Promise<number[]> {
    if (!env.mistralApiKey) {
      throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
    }

    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.mistralApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.mistralEmbedModel,
          input: [text.slice(0, 12000)],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          data?: Array<{ embedding?: number[] }>;
        };
        return validateEmbedding(payload.data?.[0]?.embedding);
      }

      const retryable = response.status === 429 || response.status === 503;
      if (!retryable || attempt === maxAttempts - 1) {
        console.error(
          JSON.stringify({
            errorCode: "EMBEDDING_FAILED",
            mistralStatus: response.status,
          })
        );
        throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
      }

      const waitMs = retryWaitMs(response, attempt);
      console.warn(
        JSON.stringify({
          event: "mistral_retry",
          mistralStatus: response.status,
          attempt: attempt + 1,
          waitMs,
        })
      );
      await sleep(waitMs);
    }

    throw new AppError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }
}
