import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("end-to-end search", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("POST /v1/search returns ranked resumes", async () => {
    const response = await request(app).post("/v1/search").send({
      query:
        "Senior agentic QA architect with RAG, MCP, DeepEval, API automation and Azure DevOps experience",
      options: {
        bm25TopK: 8,
        vectorTopK: 8,
        rerankTopN: 6,
        finalTopK: 3,
        summarize: true,
        summaryStyle: "short",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThan(0);
    expect(response.body.results.length).toBeLessThanOrEqual(3);
    expect(response.body.results[0].rank).toBe(1);
    expect(response.body.results[0].resumeId).toEqual(expect.any(String));
    expect(Array.isArray(response.body.results[0].sources)).toBe(true);
    expect(typeof response.body.timings.totalMs).toBe("number");
  }, 90000);

  it("POST /v1/search rejects an empty query", async () => {
    const response = await request(app).post("/v1/search").send({ query: "" });
    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });
});
