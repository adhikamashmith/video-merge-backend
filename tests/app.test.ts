import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("app", () => {
  it("responds to health checks", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("requires both upload fields", async () => {
    const response = await request(createApp()).post("/api/merge");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("MISSING_FILES");
  });
});
