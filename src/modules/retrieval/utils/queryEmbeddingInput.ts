import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";

const MAX_QUERY_CHARS = 8000;

export function getQueryEmbeddingInput(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "INVALID_EMBEDDING_INPUT", "Embedding input is required");
  }

  const payload = body as { input?: unknown; model?: unknown };

  if (typeof payload.model === "string" && payload.model.trim() !== "") {
    if (payload.model.trim() !== env.mistralEmbedModel) {
      throw new AppError(
        400,
        "INVALID_EMBEDDING_MODEL",
        "Embedding model must match the configured Mistral model"
      );
    }
  }

  if (typeof payload.input !== "string" || payload.input.trim() === "") {
    throw new AppError(400, "INVALID_EMBEDDING_INPUT", "Embedding input is required");
  }

  const input = payload.input.trim();
  if (input.length > MAX_QUERY_CHARS) {
    throw new AppError(
      400,
      "INVALID_EMBEDDING_INPUT",
      "Embedding input exceeds maximum length"
    );
  }

  return input;
}
