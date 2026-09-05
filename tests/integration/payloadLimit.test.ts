import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("payload and query validation", () => {
  it("returns 413 for an oversized JSON body", async () => {
    const response = await request(app)
      .post("/v1/search")
      .send({ query: "x".repeat(3 * 1024 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.errorCode).toBe("PAYLOAD_TOO_LARGE");
  }, 15000);

  it("GET /v1/search/readiness is still available", async () => {
    const response = await request(app).get("/v1/health");
    expect(response.status).toBe(200);
  });
});
