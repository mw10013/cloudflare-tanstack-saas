import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("integration smoke", () => {
  it("serves /", async () => {
    const response = await SELF.fetch("http://example.com/");
    expect([200, 302]).toContain(response.status);
  });
});
