import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("LLM rerank endpoint", () => {
  it("POST /v1/search/rerank rejects missing candidates", async () => {
    const response = await request(app).post("/v1/search/rerank").send({
      query: "senior QA architect RAG",
      candidates: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });

  it("POST /v1/search/rerank returns only supplied resume IDs", async () => {
    const response = await request(app).post("/v1/search/rerank").send({
      query:
        "Need a senior QA architect experienced in RAG, DeepEval, MCP and enterprise GenAI governance",
      candidates: [
        {
          resumeId: "691db80aa895776f97b6eca6",
          snippet:
            "Test Architect with 13+ years, RAG, DeepEval, MCP, Agentic QA System, LLM Evaluation",
        },
      ],
      topK: 10,
    });

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThan(0);
    expect(response.body.results[0].resumeId).toBe("691db80aa895776f97b6eca6");
    expect(response.body.results[0].rank).toBe(1);
    expect(typeof response.body.results[0].relevanceScore).toBe("number");
    expect(
      response.body.results.every(
        (row: { resumeId: string }) => row.resumeId === "691db80aa895776f97b6eca6"
      )
    ).toBe(true);
  }, 40000);
});
