import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("BM25 search", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("POST /v1/search/bm25 returns ranked lexical results", async () => {
    const response = await request(app).post("/v1/search/bm25").send({
      query: "agentic QA architect RAG MCP DeepEval",
      topK: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("bm25");
    expect(response.body.query).toBe("agentic QA architect RAG MCP DeepEval");
    expect(response.body.count).toBeGreaterThan(0);
    expect(response.body.results[0].resumeId).toEqual(expect.any(String));
    expect(typeof response.body.results[0].score).toBe("number");
    expect(response.body.results[0].score).toBeGreaterThan(0);

    const scores = response.body.results.map(
      (row: { score: number }) => row.score
    );
    const sorted = [...scores].sort((left: number, right: number) => right - left);
    expect(scores).toEqual(sorted);
  });

  it("POST /v1/search/bm25 applies minYearsExperience", async () => {
    const response = await request(app).post("/v1/search/bm25").send({
      query: "Python Selenium",
      topK: 10,
      filters: { minYearsExperience: 10 },
    });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("bm25");
  });

  it("POST /v1/search/bm25 rejects an empty query", async () => {
    const response = await request(app).post("/v1/search/bm25").send({
      query: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });
});
