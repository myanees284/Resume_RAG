import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";

const app = createApp();

describe("retrieval resume repository", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("GET /v1/search/sample returns a stored resume without the embedding vector", async () => {
    const response = await request(app).get("/v1/search/sample");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.resume.resumeId).toEqual(expect.any(String));
    expect(response.body.resume.hasEmbedding).toBe(true);
    expect(response.body.resume.embeddingDimension).toBe(1024);
    expect(response.body.resume).not.toHaveProperty("embedding");
    expect(typeof response.body.resume.snippet).toBe("string");
  });

  it("GET /v1/search/resumes/:resumeId fetches the same document by id", async () => {
    const sample = await request(app).get("/v1/search/sample");
    const resumeId = sample.body.resume.resumeId as string;

    const response = await request(app).get(`/v1/search/resumes/${resumeId}`);

    expect(response.status).toBe(200);
    expect(response.body.resume.resumeId).toBe(resumeId);
    expect(response.body.resume.hasEmbedding).toBe(true);
  });

  it("GET /v1/search/resumes/:resumeId returns 404 for an unknown id", async () => {
    const response = await request(app).get(
      "/v1/search/resumes/000000000000000000000000"
    );

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe("RESUME_NOT_FOUND");
  });
});
