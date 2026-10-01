import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

const TOPIC_ROUTES = new Set<string>(["harga/", "pekerjaan/", "kesejahteraan/"]);

for (const { path, heading } of PUBLIC_ROUTES) {
  test(`public smoke: ${path} is readable and can switch themes`, async ({ page, baseURL, isMobile }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light" });

    // Relative entries preserve the configured deployment's project base path.
    expect(path.startsWith("/")).toBe(false);
    expect(baseURL).toBeTruthy();
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new URL(path, baseURL).href);
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();

    if (TOPIC_ROUTES.has(path)) {
      const indicators = page.locator("main [data-topic-indicator]");
      expect(await indicators.count()).toBeGreaterThan(0);
      for (const indicator of await indicators.all()) {
        const chart = indicator.locator("[data-trend-chart]");
        await expect(chart).toHaveCount(1);
        await expect(chart.locator("svg[role=img]")).toBeVisible();
        await expect(chart.getByRole("table")).toBeVisible();
        await expect(chart.locator("caption")).not.toBeEmpty();
        expect(await chart.locator("tbody tr").count()).toBeGreaterThan(0);
      }
    }

    if (isMobile) await page.locator("header details summary").click();
    const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
    await expect(page.locator("html")).toHaveClass(/theme-ready/);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 26, 36)");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(errors).toEqual([]);
  });
}

// Reviewed official catalogue targets (design §14), independent of rendered data.
// Inspect hrefs only: hosted smoke never requests/downloads BPS publications.
const officialTargets = {
  yearbook: "https://pontianakkota.bps.go.id/id/publication/2026/02/27/d3d400239ad6cf7d959c2404/kota-pontianak-dalam-angka-2026.html",
  ihk2025: "https://pontianakkota.bps.go.id/id/publication/2026/06/05/21038398a2694540c254503d/indeks-harga-konsumen-kota-pontianak-2025.html",
  employment2025: "https://pontianakkota.bps.go.id/id/publication/2026/06/26/5cb84d57097179ac93ca2e6a/statistik-ketenagakerjaan-kota-pontianak-2025.html",
  poverty: "https://pontianakkota.bps.go.id/en/statistics-table/2/NTExIzI=/persentase-penduduk-miskin-p0-menurut-kabupaten-kota-di-provinsi-kalimantan.html",
  expenditure: "https://pontianakkota.bps.go.id/id/statistics-table/2/MzM2IzI=/pengeluaran-per-kapita-yang-disesuaikan-ppp-menurut-kabupaten-kota-provinsi-kalimantan-barat.html",
  terms: "https://pontianakkota.bps.go.id/id/term-of-use",
  ihk2021: "https://pontianakkota.bps.go.id/id/publication/2022/03/23/ba4797ae921daa1695bc088e/indeks-harga-konsumen-kota-pontianak-2021.html",
  ihk2022: "https://pontianakkota.bps.go.id/publication/2023/03/21/80edf8f05ad14ed95c009897/indeks-harga-konsumen-kota-pontianak-2022.html",
  ihk2023: "https://pontianakkota.bps.go.id/id/publication/2024/03/21/c2abcd79687989e691ea338e/indeks-harga-konsumen-kota-pontianak-2023.html",
  employment2021: "https://pontianakkota.bps.go.id/id/publication/2022/06/30/65a137725d28f9e212b449e8/labor-statistics-of-pontianak-municipality-2021.html",
  employment2022: "https://pontianakkota.bps.go.id/id/publication/2023/06/27/d5ba993f14431cb08d4fa2de/statistik-ketenagakerjaan-kota-pontianak-2022.html",
  ipm: "https://pontianakkota.bps.go.id/id/pressrelease/2026/01/23/1067/indeks-pembangunan-manusia--ipm--kota-pontianak-pada-tahun-2025-mencapai-82-80-poin.html"
};
const routeTargets = [
  { path: "harga/", targets: [officialTargets.ihk2021, officialTargets.ihk2022, officialTargets.ihk2023, officialTargets.ihk2025] },
  { path: "pekerjaan/", targets: [officialTargets.employment2021, officialTargets.employment2022, officialTargets.employment2025, officialTargets.yearbook] },
  { path: "kesejahteraan/", targets: [officialTargets.poverty, officialTargets.expenditure, officialTargets.ipm, officialTargets.yearbook] },
  { path: "data-metodologi/", targets: Object.values(officialTargets) }
];
const navigationLabels = ["Beranda", "Harga", "Pekerjaan", "Kesejahteraan", "Data & Metodologi", "Tentang"];

async function primaryNavigation(page: import("@playwright/test").Page, isMobile: boolean) {
  if (isMobile && (await page.locator("header details").getAttribute("open")) === null) {
    await page.locator("header details summary").click();
  }
  return page.getByRole("navigation", { name: isMobile ? "Navigasi utama seluler" : "Navigasi utama", exact: true });
}

test("public smoke: navigation follows every public route under the deployed base", async ({ page, baseURL, isMobile }) => {
  expect(baseURL).toBeTruthy();
  await page.goto("./");
  for (const [index, destination] of PUBLIC_ROUTES.entries()) {
    const nav = await primaryNavigation(page, isMobile);
    const expected = new URL(destination.path, baseURL);
    const link = nav.getByRole("link", { name: navigationLabels[index], exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", expected.pathname);
    await link.click();
    await expect(page).toHaveURL(expected.href);
    await expect(page.getByRole("heading", { level: 1, name: destination.heading, exact: true })).toBeVisible();
  }
});

for (const { path, targets } of routeTargets) {
  test(`public smoke: ${path} source hrefs match the official catalogue`, async ({ page }) => {
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname.endsWith("bps.go.id")) externalRequests.push(request.url());
    });
    await page.goto(path);
    const links = page.locator(path === "data-metodologi/" ? "[data-source-record] a" : ".source-panel a");
    const hrefs: string[] = [];
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      hrefs.push((await link.getAttribute("href"))!);
    }
    expect([...new Set(hrefs)].sort()).toEqual([...targets].sort());
    expect(externalRequests).toEqual([]);
  });
}

test.describe("public smoke without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const [index, route] of PUBLIC_ROUTES.entries()) {
    test(`${route.path} retains core headings, data, tables and working navigation`, async ({ page, baseURL, isMobile }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      if (route.path === "./" || TOPIC_ROUTES.has(route.path)) {
        const count = route.path === "./" ? 6 : 2;
        await expect(page.locator("[data-latest-value]")).toHaveCount(count);
        for (const value of await page.locator("[data-latest-value]").all()) {
          await expect(value).toBeVisible();
          await expect(value).not.toBeEmpty();
        }
        await expect(page.getByRole("table")).toHaveCount(count);
        await expect(page.locator("[data-trend-chart] tbody tr")).toHaveCount(count * 5);
        for (const table of await page.getByRole("table").all()) {
          await expect(table).toBeVisible();
          for (const cell of await table.locator("tbody th, tbody td").all()) {
            await expect(cell).toBeVisible();
            await expect(cell).not.toBeEmpty();
          }
        }
      }
      const nav = await primaryNavigation(page, isMobile);
      for (const [navIndex, destination] of PUBLIC_ROUTES.entries()) {
        const link = nav.getByRole("link", { name: navigationLabels[navIndex], exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", new URL(destination.path, baseURL).pathname);
      }
      // Each no-JS page must also navigate, rather than merely contain href text.
      const nextIndex = (index + 1) % PUBLIC_ROUTES.length;
      const next = PUBLIC_ROUTES[nextIndex];
      await nav.getByRole("link", { name: navigationLabels[nextIndex], exact: true }).click();
      await expect(page).toHaveURL(new URL(next.path, baseURL).href);
      await expect(page.getByRole("heading", { level: 1, name: next.heading, exact: true })).toBeVisible();
    });
  }
});
