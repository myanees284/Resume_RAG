import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim().replace(/^["']|["']$/g, "") : fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw.replace(/^["']|["']$/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: optionalNumber("PORT", 3000),
  nodeEnv: optional("NODE_ENV", "development"),
  appName: "resume-rag-backend",
  appVersion: "1.0.0",

  mongodbUri: optional("MONGODB_URI", ""),
  dbName: optional("DB_NAME", optional("MONGODB_DB_NAME", "resume_rag")),
  collectionName: optional("COLLECTION_NAME", "resumes"),
  vectorIndexName: optional("VECTOR_INDEX_NAME", "resumes_index"),
  bm25IndexName: optional("BM25_INDEX_NAME", "bm25_search"),
  retrievalDefaultTopK: optionalNumber("RETRIEVAL_DEFAULT_TOP_K", 20),

  mistralApiKey: optional("MISTRAL_API_KEY", ""),
  mistralEmbedModel: optional(
    "MISTRAL_EMBED_MODEL",
    optional("EMBEDDING_MODEL", "mistral-embed")
  ),
  embeddingDimension: optionalNumber("EMBEDDING_DIMENSION", 1024),

  useLlmParser: optional("USE_LLM_PARSER", "false") === "true",
  groqApiKey: optional("GROQ_API_KEY", ""),
  groqModel: optional("GROQ_MODEL", optional("LLM_MODEL", "")),
  rerankDefaultTopN: optionalNumber("RERANK_DEFAULT_TOP_N", 10),

  maxUploadSizeMb: optionalNumber("MAX_UPLOAD_SIZE_MB", 5),
};
