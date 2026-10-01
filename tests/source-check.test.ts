import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSource, checkSources, runSourceCheck } from "../scripts/check-sources.mjs";
import { loadAtlasData } from "../src/data/load";
import type { SourceRecord } from "../src/data/schema";

const source: SourceRecord = {
  id: "test-source", title: "Official source",
  url: "https://pontianakkota.bps.go.id/id/publication/test.html",
  publisher: "BPS Kota Pontianak", author: null, publishedOn: null,
  accessedOn: "2026-08-27", reference: "Table 1", checksumSha256: null,
  availability: "active"
};

function fetchStub(statuses: number[]) {
  const requests: { url: string; options: RequestInit }[] = [];
  const fetchImpl = async (url: string, options: RequestInit) => {
    requests.push({ url, options });
    const status = statuses.shift();
    if (status === undefined) throw new Error("Unexpected extra request");
    return new Response(null, { status });
  };
  return { requests, fetchImpl };
}

afterEach(() => vi.restoreAllMocks());

describe("read-only source availability", () => {
  it("reports a successful HEAD with transparent identity, redirect following and a 15-second limit", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const stub = fetchStub([200]);
    expect(await checkSource(source, stub.fetchImpl)).toMatchObject({
      id: "test-source", url: source.url, reachable: true, status: 200, error: null
    });
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0]).toMatchObject({ url: source.url, options: {
      method: "HEAD", redirect: "follow",
      headers: { "User-Agent": "kalbar-economic-atlas-source-check/1.0" }
    } });
    expect(stub.requests[0].options.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(15_000);
  });

  it.each([405, 501])("falls back once from HEAD %i to a one-byte GET", async (status) => {
    const stub = fetchStub([status, 206]);
    expect(await checkSource(source, stub.fetchImpl)).toMatchObject({ reachable: true, status: 206 });
    expect(stub.requests.map(({ options }) => options.method)).toEqual(["HEAD", "GET"]);
    expect(stub.requests[1].options).toMatchObject({ redirect: "follow", headers: {
      "User-Agent": "kalbar-economic-atlas-source-check/1.0", Range: "bytes=0-0"
    } });
  });

  it("reports the final destination after redirect success", async () => {
    const stub = fetchStub([200]);
    const fetchImpl = async (url: string, options: RequestInit) => {
      const response = await stub.fetchImpl(url, options);
      Object.defineProperty(response, "url", { value: "https://pontianakkota.bps.go.id/id/new.html" });
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    };
    expect(await checkSource(source, fetchImpl)).toMatchObject({
      reachable: true, finalUrl: "https://pontianakkota.bps.go.id/id/new.html", redirected: true
    });
    expect(stub.requests[0].options.redirect).toBe("follow");
  });

  it.each([204, 301, 399])("treats final HTTP %i as reachable", async (status) => {
    expect(await checkSource(source, fetchStub([status]).fetchImpl)).toMatchObject({ reachable: true, status });
  });

  it.each([404, 410, 429, 500])("reports HTTP %i for review without inferring withdrawal or retrying", async (status) => {
    const stub = fetchStub([status]);
    expect(await checkSource(source, stub.fetchImpl)).toMatchObject({ reachable: false, status, error: null });
    expect(stub.requests).toHaveLength(1);
    expect(source.availability).toBe("active");
  });

  it("does not retry an unavailable fallback", async () => {
    const stub = fetchStub([405, 500]);
    expect(await checkSource(source, stub.fetchImpl)).toMatchObject({ reachable: false, status: 500 });
    expect(stub.requests).toHaveLength(2);
  });

  it("cancels a fallback body without downloading it or downgrading received successful headers on cleanup error", async () => {
    let cancelled = false;
    let calls = 0;
    const result = await checkSource(source, async () => {
      if (calls++ === 0) return new Response(null, { status: 405 });
      return new Response(new ReadableStream({
        cancel() { cancelled = true; throw new Error("cleanup failed"); }
      }), { status: 200 });
    });
    expect(cancelled).toBe(true);
    expect(result).toMatchObject({ reachable: true, status: 200, error: null });
  });

  it.each([new TypeError("network unavailable"), new DOMException("request timed out", "TimeoutError")])(
    "reports a request error for review without changing source state: %s", async (error) => {
      expect(await checkSource(source, async () => { throw error; })).toMatchObject({
        reachable: false, status: null, error: error.message
      });
      expect(source.availability).toBe("active");
    }
  );

  it("uses the timeout signal to abort the request", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort(new DOMException("deadline", "TimeoutError")));
    expect(await checkSource(source, async (_url: string, options: RequestInit) => {
      options.signal!.throwIfAborted();
      return new Response(null, { status: 200 });
    })).toMatchObject({ reachable: false, status: null, error: "deadline" });
  });

  it("checks unique active URLs sequentially with read-only methods and preserves input", async () => {
    const sources = [source, { ...source, id: "duplicate" },
      { ...source, id: "second", url: "https://pontianakkota.bps.go.id/id/second.html" },
      ...(["temporarily-unavailable", "withdrawn-review", "withdrawn"] as const).map((availability) => ({
        ...source, id: availability, availability, url: `https://pontianakkota.bps.go.id/id/${availability}.html`
      }))];
    const before = JSON.stringify(sources);
    let inFlight = 0;
    const requests: string[] = [];
    const results = await checkSources(sources, async (url: string, options: RequestInit) => {
      expect(inFlight++).toBe(0);
      expect(["HEAD", "GET"]).toContain(options.method);
      requests.push(url);
      await Promise.resolve();
      inFlight--;
      return new Response(null, { status: 200 });
    });
    expect(requests).toEqual([source.url, "https://pontianakkota.bps.go.id/id/second.html"]);
    expect(results).toHaveLength(2);
    expect(JSON.stringify(sources)).toBe(before);
  });

  it.each([200, 429])("loads validated catalogue, reports once per URL and returns the review exit status for HTTP %i", async (status) => {
    const before = createHash("sha256").update(await readFile("data/pontianak/sources.json")).digest("hex");
    const atlas = await loadAtlasData();
    const expectedCount = new Set(atlas.sources.filter((entry) => entry.availability === "active").map((entry) => entry.url)).size;
    const lines: string[] = [];
    const stub = fetchStub(Array(expectedCount).fill(status));
    const exitCode = await runSourceCheck({ fetchImpl: stub.fetchImpl, log: (line: string) => lines.push(line) });
    expect(exitCode).toBe(status === 200 ? 0 : 1);
    expect(stub.requests).toHaveLength(expectedCount);
    expect(lines.filter((line) => line.includes("https://"))).toHaveLength(expectedCount);
    if (status === 429) expect(lines).toContain("Manual review required; no repository data was changed.");
    expect(createHash("sha256").update(await readFile("data/pontianak/sources.json")).digest("hex")).toBe(before);
  });

  it("refuses an invalid catalogue before sending any requests", async () => {
    const stub = fetchStub([]);
    await expect(runSourceCheck({ root: "/nonexistent-source-check-fixture", fetchImpl: stub.fetchImpl })).rejects.toThrow("Data validation failed");
    expect(stub.requests).toHaveLength(0);
  });
});
