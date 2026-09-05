import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("retrieval module on the same backend", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("GET /v1/health still works", async () => {
    const response = await request(app).get("/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("GET /v1/resume/health still works", async () => {
    const response = await request(app).get("/v1/resume/health");
    expect(response.status).toBe(200);
    expect(response.body.module).toBe("resume-ingestion");
  });

  it("GET /v1/search/readiness still works", async () => {
    const response = await request(app).get("/v1/search/readiness");

    expect(response.status).toBe(200);
    expect(typeof response.body.ready).toBe("boolean");
    expect(response.headers["x-request-id"]).toBeDefined();

    if (response.body.ready) {
      expect(response.body.collection).toBeDefined();
      expect(response.body.resumeCount).toBeGreaterThan(0);
      expect(response.body.resumesWithEmbedding).toBeGreaterThan(0);
      expect(response.body.embeddingDimension).toBe(1024);
    } else {
      expect(response.body.reason).toBe(
        "No ingested resume embeddings are available"
      );
    }
  });

  it("POST /v1/embeddings rejects empty input", async () => {
    const response = await request(app).post("/v1/embeddings").send({
      model: "mistral-embed",
      input: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_EMBEDDING_INPUT");
  });

  it("POST /v1/embeddings returns a 1024-dimension query vector", async () => {
    const response = await request(app).post("/v1/embeddings").send({
      model: "mistral-embed",
      input:
        "senior agentic QA architect with RAG, DeepEval and MCP experience",
    });

    expect(response.status).toBe(200);
    expect(response.body.model).toBe("mistral-embed");
    expect(response.body.dimension).toBe(1024);
    expect(response.body.embedding).toHaveLength(1024);
    expect(typeof response.body.embedding[0]).toBe("number");
  }, 30000);
});
