import { describe, expect, it } from "vitest";

describe("project configuration", () => {
  it("pins Node to the approved release", async () => {
    const packageJson = await import("../package.json", { with: { type: "json" } });
    expect(packageJson.default.engines.node).toBe("24.20.0");
  });

  it("configures a static Astro site with the canonical project path", async () => {
    const config = await import("../astro.config.mjs");
    expect(config.default).toMatchObject({
      site: "https://whizher.github.io",
      base: "/kalbar-economic-atlas",
      output: "static",
      trailingSlash: "always"
    });
  });
});
