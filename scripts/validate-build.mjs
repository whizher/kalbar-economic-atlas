import { lstat, readdir, readFile } from "node:fs/promises";
import { resolve, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { REQUIRED_PATHS, classifyArtifactPath } from "./build-policy.mjs";

const BASE = "/kalbar-economic-atlas/";
const ORIGIN = "https://atlas.invalid";
const MAX_FILE_BYTES = 500 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
// Only the reviewed theme preference code may execute. A theme change requires
// reviewing these fingerprints too; no approximate JS matching grants execution.
const THEME_SCRIPT_HASH = "60b841086d378f5ab16253d063e638ddf9de1b4ede4eebabe4f0bb22cd9263db";
const THEME_INITIALIZER_HASH = "bb682fde527ce6c33c71fc62b1c202702d64b6d783a1b89789edb6e09a40e970";
const fail = (message) => { throw new Error(message); };

function decodeEntities(text) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", colon: ":", sol: "/", bsol: "\\", Tab: "\t", NewLine: "\n" };
  return text.replace(/&(?:#(x[0-9a-f]+|[0-9]+);?|([a-z]+);)/gi, (match, numeric, name) => {
    if (!numeric) return named[name] ?? match;
    const code = numeric[0].toLowerCase() === "x" ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
  });
}

function localResource(value, path, files) {
  // URL parsing applies the browser's whitespace, protocol-relative and backslash
  // rules. Only existing files inside this exact project base may be requested.
  try {
    if (!value.trim() || /[\u0000-\u0020\\]/.test(value)) return false;
    const url = new URL(value, `${ORIGIN}${BASE}${path}`);
    if (url.origin !== ORIGIN || url.username || url.password || !url.pathname.startsWith(BASE)) return false;
    let artifact = decodeURIComponent(url.pathname.slice(BASE.length));
    if (artifact.includes("\\") || artifact.split("/").includes("..")) return false;
    if (!artifact || artifact.endsWith("/")) artifact += "index.html";
    return files.has(artifact);
  } catch { return false; }
}

function scanJavaScript(script, path, inline = false) {
  // This gives maintainers a specific error for ordinary accidental request code.
  // The fingerprints below also reject aliases, computed property calls, eval,
  // navigation changes, cookies and any other persistent application state.
  const decoded = script.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
    (_, a, b, c) => String.fromCodePoint(parseInt(a ?? b ?? c, 16)));
  if (/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|WebTransport|EventSource|Worker|SharedWorker|importScripts)\b|\bimport\s*(?:\(|["'{*])/i.test(decoded)) {
    fail(`Runtime request primitive in ${path}`);
  }
  const hash = createHash("sha256").update(script).digest("hex");
  if (hash !== (inline ? THEME_INITIALIZER_HASH : THEME_SCRIPT_HASH)) fail(`Unapproved JavaScript in ${path}`);
}

function scanCss(content, path, files) {
  // Normalize CSS escapes before comments: escaped url()/@import spellings must
  // receive the same review as their plain-text counterparts.
  const css = content.replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi,
    (_, hex, literal) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : literal)
    .replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@import\b|@namespace\b|\b(?:image-set|expression)\s*\(|-moz-binding\s*:/i.test(css)) fail(`Unsafe CSS resource in ${path}`);
  for (const match of css.matchAll(/\burl\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    if (!localResource((match[1] ?? match[2] ?? match[3]).trim(), path, files)) fail(`Unsafe CSS resource in ${path}`);
  }
}

function scanMarkup(content, path, files) {
  if (/<!--/.test(content)) fail(`Unsupported HTML comment in ${path}`);
  if (/<\?|<![^>]*(?:SYSTEM|PUBLIC|ENTITY)/i.test(content)) fail(`Unsupported XML declaration in ${path}`);
  const markup = content;
  for (const tag of ["script", "style"]) {
    const starts = [...markup.matchAll(new RegExp(`<${tag}\\b`, "gi"))].length;
    const complete = [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"))].length;
    if (starts !== complete) fail(`Unsupported unclosed ${tag} in ${path}`);
  }
  // Raw text is inspected separately, rather than treating JS strings as tags.
  for (const match of markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (match[2].trim()) scanJavaScript(match[2], path, true);
  }
  for (const match of markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) scanCss(match[1], path, files);
  const tags = markup.replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?(<\/(?:script|style)\s*>)/gi, "$1$2");
  const tagPattern = /<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/iy;
  let end = 0;
  for (const candidate of tags.matchAll(/<[a-z]/gi)) {
    if (candidate.index < end) continue;
    tagPattern.lastIndex = candidate.index;
    const match = tagPattern.exec(tags);
    if (!match) fail(`Unsupported malformed markup in ${path}`);
    end = tagPattern.lastIndex;
    const tag = match[1].toLowerCase();
    if (["base", "form", "animate", "animatetransform", "animatemotion", "set"].includes(tag)) fail(`Unsupported active HTML in ${path}: ${tag}`);
    const attributes = [];
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attributes.push([attr[1].toLowerCase(), decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? "")]);
    }
    for (const [name, value] of attributes) {
      if (name === "style" || /url\s*\(/i.test(value)) scanCss(value, path, files);
      if (name === "href" && tag === "a") {
        // Source links are user-initiated navigation; executable URL schemes are not.
        if (!/^(?:https?:\/\/|#)/i.test(value) && !localResource(value, path, files)) fail(`Unsafe resource in ${path}: a href`);
      } else if (["src", "srcset", "href", "xlink:href", "poster", "data", "action", "formaction", "ping", "background", "manifest", "codebase", "archive"].includes(name)) {
        const values = name === "srcset" ? value.split(",").map((item) => item.trim().split(/\s+/)[0]) : name === "ping" ? value.split(/\s+/) : [value];
        if (values.some((url) => !localResource(url, path, files))) fail(`Unsafe resource in ${path}: ${tag} ${name}`);
      }
      if (/^on/i.test(name) || name === "srcdoc" || (tag === "meta" && name === "http-equiv")) fail(`Unsupported active HTML in ${path}: ${tag} ${name}`);
    }
    if (["base", "form", "iframe", "object", "embed", "applet"].includes(tag)) fail(`Unsupported active HTML in ${path}: ${tag}`);
    if (tag === "script") {
      const src = attributes.find(([name]) => ["src", "href", "xlink:href"].includes(name))?.[1];
      if (src && new URL(src, `${ORIGIN}${BASE}${path}`).pathname !== `${BASE}assets/theme.js`) fail(`Unapproved JavaScript in ${path}`);
      if (attributes.some(([name]) => name === "type")) fail(`Unsupported active HTML in ${path}: script type`);
    }
    if (tag === "link" && attributes.some(([name, value]) => name === "rel" && !["stylesheet", "icon"].includes(value.toLowerCase()))) fail(`Unsupported active HTML in ${path}: link rel`);
  }
}

export async function validateBuild(root = "dist") {
  const directory = resolve(root);
  if (!(await lstat(directory)).isDirectory()) fail("Artifact root must be a directory");
  const artifacts = new Map();
  let totalBytes = 0;
  async function walk(relative = "") {
    for (const name of (await readdir(join(directory, relative))).sort()) {
      const path = posix.join(relative, name);
      const stat = await lstat(join(directory, path));
      if (stat.isSymbolicLink()) fail(`Symlink artifact: ${path}`);
      if (stat.isDirectory()) { await walk(path); continue; }
      if (!stat.isFile() || classifyArtifactPath(path) === "rejected") fail(`Rejected artifact: ${path}`);
      if (stat.size === 0) fail(`Empty artifact: ${path}`);
      if (stat.size > MAX_FILE_BYTES) fail(`Artifact exceeds 500 KiB: ${path}`);
      totalBytes += stat.size;
      artifacts.set(path, await readFile(join(directory, path), "utf8"));
    }
  }
  await walk();
  for (const path of REQUIRED_PATHS) if (!artifacts.has(path)) fail(`Missing required artifact: ${path}`);
  if (![...artifacts.keys()].some((path) => classifyArtifactPath(path) === "allowed-generated")) fail("Missing generated CSS artifact");
  if (totalBytes > MAX_TOTAL_BYTES) fail("Artifact exceeds 2 MiB total");
  for (const [path, content] of artifacts) {
    if (path.endsWith(".html") || path.endsWith(".svg")) scanMarkup(content, path, artifacts);
    else if (path.endsWith(".css")) scanCss(content, path, artifacts);
    else if (path.endsWith(".js")) scanJavaScript(content, path);
  }
  return { fileCount: artifacts.size, totalBytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await validateBuild(process.argv[2] ?? "dist");
    console.log(`Validated static artifact: ${result.fileCount} files, ${result.totalBytes} bytes`);
  } catch (error) {
    console.error(`Build policy failed: ${error.message}`);
    process.exitCode = 1;
  }
}
