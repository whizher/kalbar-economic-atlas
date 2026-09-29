import { expect, test } from "@playwright/test";
import { parseAtlasData } from "../src/data/schema";

const indicatorIds = [
  "adjusted-expenditure-per-capita", "food-inflation", "headline-inflation",
  "poverty-rate", "tpak", "tpt"
];

test("validated indicator snapshot contains only the public contract", async ({ request }) => {
  const response = await request.get("data/pontianak/indicators.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^application\/json(?:;|$)/);
  const raw = await response.text();
  expect(raw).toMatch(/\n$/);
  expect(raw).toContain("\n  \"geography\":");
  const snapshot = JSON.parse(raw);
  expect(Object.keys(snapshot).sort()).toEqual(["geography", "indicators", "verifications"]);
  expect(snapshot.geography).toEqual({
    code: "6171", name: "Kota Pontianak", province: "Kalimantan Barat", scope: "municipality"
  });
  expect(snapshot.indicators.map((item: { id: string }) => item.id).sort()).toEqual(indicatorIds);
  expect(snapshot.indicators.reduce((count: number, item: { trend: unknown[] }) => count + item.trend.length, 0)).toBe(30);
  for (const verification of snapshot.verifications) {
    expect(Object.keys(verification).sort()).toEqual(["checks", "id", "method", "passCount", "verifiedOn"]);
    expect(verification).toMatchObject({ method: "two-pass-manual", passCount: 2 });
  }
  for (const indicator of snapshot.indicators) {
    expect(Object.keys(indicator).sort()).toEqual([
      "comparabilityNote", "frequency", "geographyCode", "id", "label", "latest", "methodologyNote",
      "movement", "officialDefinition", "precision", "revision", "shortDefinition", "sourceIds",
      "topic", "trend", "trendReference", "unit", "verificationId", "whyItMatters"
    ]);
    expect(indicator.geographyCode).toBe("6171");
    expect(indicator.sourceIds.length).toBeGreaterThan(0);
    expect(snapshot.verifications.some((record: { id: string }) => record.id === indicator.verificationId)).toBe(true);
  }
  const sourcesResponse = await request.get("data/pontianak/sources.json");
  expect(sourcesResponse.status()).toBe(200);
  const sources = JSON.parse(await sourcesResponse.text());
  expect(() => parseAtlasData({ ...snapshot, sources })).not.toThrow();
});

test("joined source catalogue preserves complete attribution without internal fields", async ({ request }) => {
  const response = await request.get("data/pontianak/sources.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^application\/json(?:;|$)/);
  const raw = await response.text();
  expect(raw).toMatch(/\n$/);
  expect(raw).toContain("\n  {\n");
  const sources = JSON.parse(raw);
  expect(sources).toHaveLength(12);
  const ids = new Set(sources.map((source: { id: string }) => source.id));
  expect(ids.size).toBe(12);
  for (const source of sources) {
    expect(Object.keys(source).sort()).toEqual([
      "accessedOn", "author", "availability", "checksumSha256", "id", "publishedOn",
      "publisher", "reference", "title", "url"
    ]);
    expect(source).toMatchObject({ publisher: "BPS Kota Pontianak", accessedOn: "2026-08-27" });
    expect(source.title).toBeTruthy();
    expect(source.reference).toBeTruthy();
    expect(source.url).toMatch(/^https:\/\/pontianakkota\.bps\.go\.id\//);
  }
});
