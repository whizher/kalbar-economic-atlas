// The v1 public contract is deliberately closed: an extra file is a build failure.
export const REQUIRED_PATHS = new Set([
  "index.html",
  "harga/index.html",
  "pekerjaan/index.html",
  "kesejahteraan/index.html",
  "data-metodologi/index.html",
  "tentang/index.html",
  "404.html",
  "data/pontianak/indicators.json",
  "data/pontianak/sources.json",
  "assets/favicon.svg",
  "assets/theme.js",
  "robots.txt"
]);

export const ALLOWED_GENERATED = [/^_astro\/[a-zA-Z0-9_-]+\.css$/];

export function classifyArtifactPath(path) {
  if (REQUIRED_PATHS.has(path)) return "required";
  if (ALLOWED_GENERATED.some((pattern) => pattern.test(path))) return "allowed-generated";
  return "rejected";
}
