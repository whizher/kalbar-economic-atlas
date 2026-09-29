export const SITE = {
  title: "Atlas Ekonomi Pontianak",
  description: "Harga, pekerjaan, dan kesejahteraan Pontianak dari data resmi yang dijelaskan untuk semua orang.",
  repository: "https://github.com/whizher/kalbar-economic-atlas",
  basePath: "/kalbar-economic-atlas",
  navigation: [
    ["Beranda", "/"],
    ["Harga", "/harga/"],
    ["Pekerjaan", "/pekerjaan/"],
    ["Kesejahteraan", "/kesejahteraan/"],
    ["Data & Metodologi", "/data-metodologi/"],
    ["Tentang", "/tentang/"]
  ]
} as const;

export const withBase = (path: string) =>
  `${SITE.basePath}${path === "/" ? "/" : path}`;
