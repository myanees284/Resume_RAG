import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("hybrid search", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("POST /v1/search/hybrid returns separate BM25 and vector lists", async () => {
    const response = await request(app).post("/v1/search/hybrid").send({
      query: "agentic QA architect with RAG evaluation",
      topK: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("hybrid-debug");
    expect(response.body.bm25.length).toBeGreaterThan(0);
    expect(response.body.vector.length).toBeGreaterThan(0);
    expect(response.body.bm25[0]).toHaveProperty("score");
    expect(response.body.vector[0]).toHaveProperty("score");
    expect(typeof response.body.timings.bm25Ms).toBe("number");
    expect(typeof response.body.timings.embeddingMs).toBe("number");
    expect(typeof response.body.timings.vectorMs).toBe("number");
    expect(Array.isArray(response.body.pool)).toBe(true);
    expect(response.body.pool.length).toBeGreaterThan(0);
    const resumeIds = response.body.pool.map(
      (row: { resumeId: string }) => row.resumeId
    );
    expect(new Set(resumeIds).size).toBe(resumeIds.length);
  }, 40000);

  it("POST /v1/search/hybrid rejects an empty query", async () => {
    const response = await request(app).post("/v1/search/hybrid").send({
      query: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });
});
