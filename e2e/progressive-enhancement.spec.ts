import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

const latest = ["2,32%", "1,50%", "61,77%", "7,91%", "16.725 ribu rupiah PPP per orang per tahun", "4,00%"];
const observations = [
  ["Desember 2021", "0,79%"], ["Desember 2022", "5,43%"], ["Desember 2023", "3,19%"], ["Desember 2024", "3,38%"], ["Desember 2025", "2,32%"],
  ["Desember 2021", "1,16%"], ["Desember 2022", "6,35%"], ["Desember 2023", "2,09%"], ["Desember 2024", "1,58%"], ["Desember 2025", "1,50%"],
  ["Agustus 2021", "61,94%"], ["Agustus 2022", "64,82%"], ["Agustus 2023", "63,47%"], ["Agustus 2024", "64,53%"], ["Agustus 2025", "61,77%"],
  ["Agustus 2021", "12,38%"], ["Agustus 2022", "9,92%"], ["Agustus 2023", "8,92%"], ["Agustus 2024", "8,29%"], ["Agustus 2025", "7,91%"],
  ["Tahun 2021", "14.610 ribu rupiah PPP per orang per tahun"], ["Tahun 2022", "15.141 ribu rupiah PPP per orang per tahun"], ["Tahun 2023", "15.632 ribu rupiah PPP per orang per tahun"], ["Tahun 2024", "16.212 ribu rupiah PPP per orang per tahun"], ["Tahun 2025", "16.725 ribu rupiah PPP per orang per tahun"],
  ["Maret 2021", "4,58%"], ["Maret 2022", "4,46%"], ["Maret 2023", "4,45%"], ["Maret 2024", "4,20%"], ["Maret 2025", "4,00%"]
];

test.describe("core content without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("all six latest values and thirty observations remain readable", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("[data-latest-value]")).toHaveText(latest);
    for (const value of await page.locator("[data-latest-value]").all()) await expect(value).toBeVisible();
    const rows = page.locator("[data-trend-chart] tbody tr");
    await expect(rows).toHaveCount(30);
    for (const [index, [period, value]] of observations.entries()) {
      await expect(rows.nth(index).getByRole("rowheader")).toHaveText(period);
      await expect(rows.nth(index).getByRole("cell")).toHaveText(value);
      await expect(rows.nth(index)).toBeVisible();
    }
    for (const table of await page.getByRole("table").all()) await expect(table).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} retains navigation, static headings, and sources`, async ({ page, isMobile, baseURL }) => {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      if (isMobile) await page.locator("header details summary").click();
      const nav = page.getByRole("navigation", { name: isMobile ? "Navigasi utama seluler" : "Navigasi utama", exact: true });
      for (const destination of PUBLIC_ROUTES) {
        const link = nav.locator(`a[href="${new URL(destination.path, baseURL).pathname}"]`);
        await expect(link).toBeVisible();
      }
      if (["harga/", "pekerjaan/", "kesejahteraan/"].includes(route.path)) {
        await expect(page.locator("[data-topic-indicator]")).toHaveCount(2);
        await expect(page.locator("[data-trend-chart] tbody tr")).toHaveCount(10);
        for (const source of await page.locator(".source-panel a[href^='https://pontianakkota.bps.go.id/']").all()) await expect(source).toBeVisible();
        expect(await page.locator(".source-panel a[href^='https://pontianakkota.bps.go.id/']").count()).toBeGreaterThan(0);
      }
      if (route.path === "data-metodologi/") {
        await expect(page.locator("[data-source-record]")).toHaveCount(12);
        for (const source of await page.locator("[data-source-record] a").all()) await expect(source).toBeVisible();
      }
    });
  }
});

for (const route of PUBLIC_ROUTES) {
  test(`${route.path} initiates only same-origin requests and leaves persistence empty`, async ({ page, baseURL }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.filter((url) => new URL(url).origin !== new URL(baseURL!).origin)).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.context().cookies()).toEqual([]);
    expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })))
      .toEqual({ local: [], session: [] });
  });
}

test("only a deliberate theme choice persists as atlas-theme light/dark", async ({ page, isMobile }) => {
  await page.goto("./");
  if (isMobile) await page.locator("header details summary").click();
  const toggle = page.getByRole("button", { name: /Gunakan mode/ }).filter({ visible: true });
  await toggle.click();
  const theme = await page.locator("html").getAttribute("data-theme");
  expect(["light", "dark"]).toContain(theme);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ "atlas-theme": theme });
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});
