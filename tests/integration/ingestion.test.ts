import fs from "fs/promises";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, connectDatabase } from "../../src/config/database";
import { buildSampleResumePdf } from "../helpers/samplePdf";

const app = createApp();

async function attachPdf(
  req: request.Test,
  filename: string
): Promise<request.Test> {
  const pdfPath = path.join(os.tmpdir(), filename);
  await fs.writeFile(pdfPath, await buildSampleResumePdf());
  return req.attach("file", pdfPath);
}

describe("ingestion integration", () => {
  beforeAll(async () => {
    await connectDatabase();
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
  });

  it("GET /v1/health", async () => {
    const response = await request(app).get("/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("GET /v1/health/db", async () => {
    const response = await request(app).get("/v1/health/db");
    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(true);
  });

  it("rejects a non-PDF upload", async () => {
    const response = await request(app)
      .post("/v1/resume/upload")
      .attach("file", Buffer.from("not a pdf"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(415);
    expect(response.body.errorCode).toBe("INVALID_FILE_TYPE");
    expect(response.body.requestId).toBeDefined();
  });

  it("rejects a missing file", async () => {
    const response = await request(app).post("/v1/resume/ingest");
    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("FILE_REQUIRED");
  });

  it("POST /v1/resume/extract", async () => {
    const response = await attachPdf(
      request(app).post("/v1/resume/extract"),
      "sample-extract.pdf"
    );

    expect(response.status).toBe(200);
    expect(response.body.rawText).toMatch(/Rajesh Mohan Kumar/i);
  });

  it("POST /v1/resume/parse", async () => {
    const response = await request(app)
      .post("/v1/resume/parse")
      .send({
        rawText:
          "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer\nTestleaf Software Solutions Private Limited\nB.Tech - Information Technology\n13+ years of experience\nPython RAG",
      });

    expect(response.status).toBe(200);
    expect(response.body.resume.name).toBe("Rajesh Mohan Kumar");
    expect(response.body.resume.totalExperience).toBe(13);
  });

  it("POST /v1/resume/embed", async () => {
    const response = await request(app)
      .post("/v1/resume/embed")
      .send({
        name: "Rajesh Mohan Kumar",
        role: "Test Architect",
        skills: ["RAG"],
        company: "Testleaf",
        rawText: "13+ years of experience",
      });

    expect(response.status).toBe(200);
    expect(response.body.dimension).toBe(1024);
    expect(response.body.embedding).toHaveLength(1024);
  }, 30000);

  it("POST /v1/resume/store", async () => {
    const embedding = Array.from({ length: 1024 }, (_, index) => index * 0.0001);
    const response = await request(app)
      .post("/v1/resume/store")
      .send({
        fileName: `test-store-${Date.now()}.pdf`,
        rawText: "Rajesh Mohan Kumar test store",
        resume: {
          name: "Rajesh Mohan Kumar",
          role: "Test Architect",
          skills: ["RAG"],
        },
        embedding,
      });

    expect(response.status).toBe(200);
    expect(response.body.resumeId).toEqual(expect.any(String));
  }, 20000);

  it("POST /v1/resume/ingest end to end", async () => {
    const response = await attachPdf(
      request(app).post("/v1/resume/ingest"),
      `test-ingest-${Date.now()}.pdf`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.resumeId).toEqual(expect.any(String));
    expect(response.body.data.embeddingDimension).toBe(1024);
    expect(response.body.timings.totalMs).toBeGreaterThan(0);
  }, 60000);
});
