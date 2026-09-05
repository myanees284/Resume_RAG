import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("vector search", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("POST /v1/search/vector returns semantically ranked resumes", async () => {
    const response = await request(app).post("/v1/search/vector").send({
      query: "senior engineer who has built safe RAG and LLM evaluation systems",
      topK: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("vector");
    expect(response.body.count).toBeGreaterThan(0);
    expect(response.body.results[0].resumeId).toEqual(expect.any(String));
    expect(typeof response.body.results[0].vectorScore).toBe("number");
    expect(response.body.results[0]).not.toHaveProperty("embedding");

    const scores = response.body.results.map(
      (row: { vectorScore: number }) => row.vectorScore
    );
    const sorted = [...scores].sort((left: number, right: number) => right - left);
    expect(scores).toEqual(sorted);
  }, 30000);

  it("POST /v1/search/vector rejects an empty query", async () => {
    const response = await request(app).post("/v1/search/vector").send({
      query: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });
});
