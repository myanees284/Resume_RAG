import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("candidate summarization", () => {
  it("POST /v1/search/summarize rejects a missing candidate snippet", async () => {
    const response = await request(app).post("/v1/search/summarize").send({
      query: "Senior QA architect with GenAI RAG",
      candidate: { resumeId: "abc" },
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });

  it("POST /v1/search/summarize returns a grounded summary", async () => {
    const response = await request(app).post("/v1/search/summarize").send({
      query: "Senior QA architect with GenAI RAG and evaluation experience",
      candidate: {
        resumeId: "691db80aa895776f97b6eca6",
        snippet:
          "13+ years ... RAG ... DeepEval ... MCP ... Agentic QA System ...",
      },
      style: "short",
      maxTokens: 150,
    });

    expect(response.status).toBe(200);
    expect(response.body.resumeId).toBe("691db80aa895776f97b6eca6");
    expect(typeof response.body.summary).toBe("string");
    expect(response.body.summary.length).toBeGreaterThan(0);
  }, 40000);
});
