import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadAtlasData } from "../src/data/load.ts";

/** @typedef {import('../src/data/schema.ts').SourceRecord} SourceRecord */
/** @typedef {(url: string, options: RequestInit) => Promise<Response>} FetchSource */

/**
 * Availability failures are observations for manual review, never evidence of withdrawal.
 * @param {SourceRecord} source
 * @param {FetchSource} fetchImpl
 */
export async function checkSource(source, fetchImpl = fetch) {
  const result = {
    id: source.id,
    url: source.url,
    finalUrl: source.url,
    redirected: false,
    reachable: false,
    /** @type {number | null} */
    status: null,
    /** @type {string | null} */
    error: null
  };

  try {
    const signal = AbortSignal.timeout(15_000);
    const headers = { "User-Agent": "kalbar-economic-atlas-source-check/1.0" };
    let response = await fetchImpl(source.url, {
      method: "HEAD", redirect: "follow", headers, signal
    });
    if (response.status === 405 || response.status === 501) {
      await response.body?.cancel().catch(() => {});
      response = await fetchImpl(source.url, {
        method: "GET", redirect: "follow",
        headers: { ...headers, Range: "bytes=0-0" }, signal
      });
    }
    result.status = response.status;
    result.finalUrl = response.url || source.url;
    result.redirected = response.redirected;
    result.reachable = response.status >= 200 && response.status < 400;
    // Do not consume a publication if a server ignores the range request.
    // Cleanup failure does not invalidate the HTTP headers already received.
    await response.body?.cancel().catch(() => {});
  } catch (error) {
    result.reachable = false;
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
}

/**
 * @param {SourceRecord[]} sources
 * @param {FetchSource} fetchImpl
 */
export async function checkSources(sources, fetchImpl = fetch) {
  const seen = new Set();
  const results = [];
  for (const source of sources) {
    if (source.availability !== "active" || seen.has(source.url)) continue;
    seen.add(source.url);
    results.push(await checkSource(source, fetchImpl));
  }
  return results;
}

/**
 * @param {{root?: string, fetchImpl?: FetchSource, log?: (line: string) => void}} options
 */
export async function runSourceCheck({ root = process.cwd(), fetchImpl = fetch, log = console.log } = {}) {
  const atlas = await loadAtlasData(root);
  const results = await checkSources(atlas.sources, fetchImpl);
  for (const result of results) {
    const observation = result.error ? `request error: ${result.error}` : `HTTP ${result.status}`;
    const redirect = result.redirected ? ` -> ${result.finalUrl}` : "";
    log(`${result.reachable ? "REACHABLE" : "REVIEW"} ${result.id}: ${observation} ${result.url}${redirect}`);
  }
  if (results.some((result) => !result.reachable)) {
    log("Manual review required; no repository data was changed.");
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = await runSourceCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("Manual review required; no repository data was changed.");
    process.exitCode = 1;
  }
}
