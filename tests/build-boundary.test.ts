import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { classifyArtifactPath } from "../scripts/build-policy.mjs";
import { validateBuild } from "../scripts/validate-build.mjs";

// These literal paths are the public release contract, independent of the classifier.
const required = ["index.html", "harga/index.html", "pekerjaan/index.html", "kesejahteraan/index.html",
  "data-metodologi/index.html", "tentang/index.html", "404.html", "data/pontianak/indicators.json",
  "data/pontianak/sources.json", "assets/favicon.svg", "assets/theme.js", "robots.txt"];
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "atlas-boundary-")); roots.push(root);
  for (const path of [...required, "_astro/SiteShell-abc_123-XYZ.css"]) {
    await mkdir(join(root, path, ".."), { recursive: true });
    const content = path === "assets/theme.js" ? await readFile("public/assets/theme.js", "utf8")
      : path.endsWith(".html") ? '<!doctype html><html><head><link rel="stylesheet" href="/kalbar-economic-atlas/_astro/SiteShell-abc_123-XYZ.css"></head><body><a href="https://pontianakkota.bps.go.id/">Source</a></body></html>'
      : path.endsWith(".css") ? "body{color:navy}" : path.endsWith(".svg") ? '<svg xmlns="http://www.w3.org/2000/svg"></svg>' : "{}";
    await writeFile(join(root, path), content);
  }
  return root;
}
async function replace(root: string, path: string, content: string) { await writeFile(join(root, path), content); }

describe("static artifact inventory", () => {
  it.each(required)("requires %s", (path) => expect(classifyArtifactPath(path)).toBe("required"));
  it.each(["_astro/SiteShell-aBc123_-.css", "_astro/harga-XYZ.css"])("allows generated CSS %s", (path) => expect(classifyArtifactPath(path)).toBe("allowed-generated"));
  it.each(["assets/theme.js.map", "tests/fixture.html", "README.md", "data/pontianak/raw.csv", "publication.pdf", ".env", "package-lock.json", "_astro/client.123.js", "assets/nested/theme.js", "file.exe", "extra.html", "data/other.json", "_astro/sub/style.css", "_astro/SiteShell.hash.css", "../index.html", "/index.html", "harga\\index.html"])("rejects %s", (path) => expect(classifyArtifactPath(path)).toBe("rejected"));
  it("reports the complete approved artifact", async () => {
    const root = await fixture();
    const result = await validateBuild(root);
    expect(result.fileCount).toBe(13); expect(result.totalBytes).toBeGreaterThan(0);
  });
  it.each(required)("rejects missing %s", async (path) => {
    const root = await fixture(); await rm(join(root, path));
    await expect(validateBuild(root)).rejects.toThrow(`Missing required artifact: ${path}`);
  });
  it("requires emitted CSS", async () => {
    const root = await fixture(); await rm(join(root, "_astro"), { recursive: true });
    await expect(validateBuild(root)).rejects.toThrow("Missing generated CSS artifact");
  });
  it("rejects even an approved path when it is a symlink", async () => {
    const root = await fixture(); await rm(join(root, "robots.txt")); await symlink(join(root, "index.html"), join(root, "robots.txt"));
    await expect(validateBuild(root)).rejects.toThrow("Symlink artifact: robots.txt");
  });
  it("rejects symlink directories", async () => {
    const root = await fixture(); await symlink(join(root, "assets"), join(root, "alias"));
    await expect(validateBuild(root)).rejects.toThrow("Symlink artifact: alias");
  });
  it("rejects unknown files", async () => {
    const root = await fixture(); await replace(root, "private.pdf", "private");
    await expect(validateBuild(root)).rejects.toThrow("Rejected artifact: private.pdf");
  });
  it("rejects empty artifacts", async () => {
    const root = await fixture(); await replace(root, "robots.txt", "");
    await expect(validateBuild(root)).rejects.toThrow("Empty artifact: robots.txt");
  });
  it("rejects individual artifacts over 500 KiB", async () => {
    const root = await fixture(); await replace(root, "robots.txt", "x".repeat(500 * 1024 + 1));
    await expect(validateBuild(root)).rejects.toThrow("Artifact exceeds 500 KiB: robots.txt");
  });
  it("rejects a total over 2 MiB", async () => {
    const root = await fixture();
    for (const path of required.filter((path) => path.endsWith(".html"))) await replace(root, path, "x".repeat(310 * 1024));
    await expect(validateBuild(root)).rejects.toThrow("Artifact exceeds 2 MiB total");
  });
  it("CLI exits nonzero on a rejected artifact", async () => {
    const root = await fixture(); await replace(root, "secret.env", "secret");
    const result = spawnSync(process.execPath, ["scripts/validate-build.mjs", root], { encoding: "utf8" });
    expect(result.status).toBe(1); expect(result.stderr).toContain("Rejected artifact: secret.env");
  });
});

describe("built resource and privacy boundary", () => {
  it.each([
    ['<script src="https://remote.test/a.js"></script>', "script src"],
    ['<img src="https://remote.test/image.png">', "img src"],
    ['<link rel="stylesheet" href="https://remote.test/a.css">', "link href"],
    ['<iframe src="https://remote.test/"></iframe>', "iframe src"],
    ['<audio src="https://remote.test/a.mp3"></audio>', "audio src"],
    ['<video src="https://remote.test/a.mp4"></video>', "video src"],
    ['<source src="https://remote.test/a.mp4">', "source src"],
    ['<video poster="//remote.test/a.png"></video>', "video poster"],
    ['<img srcset="/kalbar-economic-atlas/assets/favicon.svg 1x, https://remote.test/a.png 2x">', "img srcset"],
    ['<img SRC=https://remote.test/a.png>', "img src"],
    ['<img src="&#104;ttps&#58;//remote.test/a.png">', "img src"],
    ['<img src="https:&Tab;//remote.test/a.png">', "img src"],
    ['<image href="https://remote.test/a.svg"/>', "image href"],
    ['<a href="https://bps.go.id/" ping="https://remote.test/log">Source</a>', "a ping"],
    ['<object data="https://remote.test/a"></object>', "object data"],
    ['<img src="data:image/svg+xml,remote">', "img src"],
    ['<script src="/outside.js"></script>', "script src"],
    ['<img src="/kalbar-economic-atlas/assets/missing.svg">', "img src"],
  ])("rejects unsafe resource %s", async (html, location) => {
    const root = await fixture(); await replace(root, "index.html", html);
    await expect(validateBuild(root)).rejects.toThrow(`Unsafe resource in index.html: ${location}`);
  });
  it.each([
    ["body{background:url(https://remote.test/a)}", "_astro/SiteShell-abc_123-XYZ.css"],
    ['@import "https://remote.test/a.css";', "_astro/SiteShell-abc_123-XYZ.css"],
    ['body{background:u\\72l(\\68ttps://remote.test/a)}', "_astro/SiteShell-abc_123-XYZ.css"],
    ['<style>body{background:url(//remote.test/a)}</style>', "index.html"],
    ['<p style="background:url(https://remote.test/a)">text</p>', "index.html"],
    ['<svg><path fill="url(https://remote.test/a#id)"/></svg>', "assets/favicon.svg"],
  ])("rejects external CSS resources including inline content %s", async (content, path) => {
    const root = await fixture(); await replace(root, path, content);
    await expect(validateBuild(root)).rejects.toThrow(`Unsafe CSS resource in ${path}`);
  });
  it.each(["fetch('/data')", "window.fetch('/data')", "new XMLHttpRequest()", "navigator.sendBeacon('/log', 'x')", "new WebSocket('wss://remote.test')", "new EventSource('/events')", "import('/remote.js')", "new Worker('/worker.js')"])("rejects request primitive %s", async (script) => {
    const root = await fixture(); await replace(root, "assets/theme.js", script);
    await expect(validateBuild(root)).rejects.toThrow("Runtime request primitive in assets/theme.js");
  });
  it("scans inline script content", async () => {
    const root = await fixture(); await replace(root, "index.html", '<script>fetch("https://remote.test")</script>');
    await expect(validateBuild(root)).rejects.toThrow("Runtime request primitive in index.html");
  });
  it.each(['localStorage.setItem("user", "id")', 'localStorage.setItem("atlas-theme", "tracking")', 'sessionStorage.setItem("atlas-theme", "dark")', 'document.cookie="user=id"', 'indexedDB.open("users")', 'window["fe" + "tch"]("/log")', 'location.href="https://remote.test/"'])("rejects unapproved JavaScript %s", async (script) => {
    const root = await fixture(); await replace(root, "assets/theme.js", script);
    await expect(validateBuild(root)).rejects.toThrow(/(?:Unapproved JavaScript|Persistent state)/);
  });
  it.each(['<base href="https://remote.test/">', '<meta http-equiv="refresh" content="0;url=https://remote.test">', '<iframe srcdoc="remote"></iframe>', '<button onclick="fetch(1)">Click</button>', '<form action="https://remote.test/"></form>'])("rejects active HTML escape hatch %s", async (html) => {
    const root = await fixture(); await replace(root, "index.html", html);
    await expect(validateBuild(root)).rejects.toThrow(/Unsupported active HTML/);
  });
  it.each(['<img src="https://remote.test/a.png>', '<img src=https://remote.test/a.png', '<!-- --!><img src="https://remote.test/a.png">', '<svg><animate attributeName="href" to="https://remote.test/a"/></svg>', '<script>fetch("/log")', '<style>body{background:url(https://remote.test/a)}', '<?xml-stylesheet href="https://remote.test/a.css"?><svg/>'])("fails closed on unsupported markup %s", async (html) => {
    const root = await fixture(); await replace(root, "index.html", html);
    await expect(validateBuild(root)).rejects.toThrow(/Unsupported/);
  });
  it("allows ordinary external source anchors and local CSS references", async () => {
    const root = await fixture(); await replace(root, "_astro/SiteShell-abc_123-XYZ.css", 'body{background:url(../assets/favicon.svg)}');
    await expect(validateBuild(root)).resolves.toMatchObject({ fileCount: 13 });
  });
});
