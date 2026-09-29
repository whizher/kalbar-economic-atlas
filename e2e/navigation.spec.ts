import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

test("home exposes Indonesian landmarks, skip link, and project-bound navigation", async ({ page, isMobile, baseURL }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.goto("./");

  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: PUBLIC_ROUTES[0].heading })).toBeVisible();
  const skip = page.getByRole("link", { name: /lewati.*konten/i });
  await expect(skip).toHaveAttribute("href", "#konten-utama");
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#konten-utama$/);
  await expect(page.getByRole("main")).toBeFocused();

  const nav = page.getByRole("navigation", { name: /utama/i, includeHidden: true });
  if (isMobile) {
    const disclosure = page.locator("header details");
    await expect(disclosure).toBeVisible();
    await disclosure.locator("summary").click();
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(nav.last()).toBeVisible();
  } else {
    await expect(nav.first()).toBeVisible();
  }

  const activeNav = isMobile ? nav.last() : nav.first();
  const labels = ["Beranda", "Harga", "Pekerjaan", "Kesejahteraan", "Data & Metodologi", "Tentang"];
  for (const [index, route] of PUBLIC_ROUTES.entries()) {
    const expected = new URL(route.path, baseURL).pathname;
    const destination = activeNav.getByRole("link", { name: labels[index], exact: true });
    await expect(destination).toHaveCount(1);
    await expect(destination).toHaveAttribute("href", expected);
    await expect(destination).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("home groups six latest indicators into three linked topic summaries with individual freshness", async ({ page, baseURL }) => {
  await page.goto("./");
  const topics = page.locator("[data-topic-summary]");
  await expect(topics).toHaveCount(3);
  for (const [index, topic] of [
    { name: "Harga", path: "harga/" },
    { name: "Pekerjaan", path: "pekerjaan/" },
    { name: "Kesejahteraan", path: "kesejahteraan/" }
  ].entries()) {
    const summary = topics.nth(index);
    await expect(summary.getByRole("heading", { name: topic.name, exact: true })).toBeVisible();
    await expect(summary.getByRole("link", { name: new RegExp(`^Selengkapnya tentang ${topic.name}$`) }))
      .toHaveAttribute("href", new URL(topic.path, baseURL).pathname);
    await expect(summary.locator("[data-indicator-card]")).toHaveCount(2);
    await expect(summary.locator("[data-trend-chart]")).toHaveCount(2);
  }
  const cards = page.locator("main [data-indicator-card]");
  await expect(cards).toHaveCount(6);
  for (const [index, { period, value }] of [
    { period: "Desember 2025", value: "2,32%" },
    { period: "Desember 2025", value: "1,50%" },
    { period: "Agustus 2025", value: "61,77%" },
    { period: "Agustus 2025", value: "7,91%" },
    { period: "Tahun 2025", value: "16.725 ribu rupiah PPP per orang per tahun" },
    { period: "Maret 2025", value: "4,00%" }
  ].entries()) {
    const card = cards.nth(index);
    await expect(card.getByText(`Periode terbaru: ${period}`, { exact: true })).toBeVisible();
    await expect(card.getByText(`Data terbaru yang tersedia untuk indikator ini: ${period}`, { exact: true })).toBeVisible();
    await expect(card.locator("[data-latest-value]")).toHaveText(value);
  }
  const readingOrder = await page.locator("main h1, main .lead, main [data-topic-summary], main [data-methodology-callout]")
    .evaluateAll((elements) => elements.map((element) => element.matches("h1") ? "heading" : element.matches(".lead") ? "explanation" : element.hasAttribute("data-topic-summary") ? "topic" : "methodology"));
  expect(readingOrder).toEqual(["heading", "explanation", "topic", "topic", "topic", "methodology"]);
});

test("every home chart names its SVG and matches five table rows and point labels", async ({ page }) => {
  await page.goto("./");
  const charts = page.locator("main [data-trend-chart]");
  await expect(charts).toHaveCount(6);
  for (const chart of await charts.all()) {
    const svg = chart.locator("svg[role=img]");
    await expect(svg).toHaveCount(1);
    const titleId = await svg.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    await expect(svg.locator(`title[id="${titleId}"]`)).toHaveCount(1);
    const accessibleName = await svg.locator("title").textContent();
    await expect(chart.getByRole("img", { name: accessibleName! })).toHaveCount(1);
    await expect(chart.locator("[data-trend-summary]")).not.toBeEmpty();
    const rows = chart.locator("tbody tr");
    await expect(rows).toHaveCount(5);
    const cells = await rows.evaluateAll((elements) => elements.map((row) => [...row.querySelectorAll("th, td")].map((cell) => cell.textContent?.trim())));
    const labels = await svg.locator("circle[aria-label]").evaluateAll((elements) => elements.map((point) => point.getAttribute("aria-label")));
    expect(labels).toEqual(cells.map(([period, value]) => `${period}: ${value}`));
  }
});

for (const { path, heading, labels, interpretation } of [
  { path: "harga/", heading: PUBLIC_ROUTES[1].heading, labels: ["Inflasi umum", "Inflasi makanan, minuman, dan tembakau"], interpretation: [/year-on-year/i, /tingkat indeks dari dasar yang berbeda tidak disambungkan/i] },
  { path: "pekerjaan/", heading: PUBLIC_ROUTES[2].heading, labels: ["Tingkat Pengangguran Terbuka (TPT)", "Tingkat Partisipasi Angkatan Kerja (TPAK)"], interpretation: [/Sakernas Agustus/i] },
  { path: "kesejahteraan/", heading: PUBLIC_ROUTES[3].heading, labels: ["Persentase penduduk miskin (P0)", "Pengeluaran per kapita yang disesuaikan"], interpretation: [/Pengeluaran per kapita yang disesuaikan bukan pendapatan, gaji, atau uang tunai yang diterima rumah tangga/i] }
]) {
  test(`${path} explains both indicators with comparable trends and sources`, async ({ page, baseURL }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new URL(path, baseURL).href);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: /Beranda/i }).first()).toHaveAttribute("href", new URL("./", baseURL).pathname);

    const indicators = page.locator("main [data-topic-indicator]");
    await expect(indicators).toHaveCount(2);
    expect(await indicators.locator("[data-indicator-card] h3").allTextContents()).toEqual(labels);
    await expect(page.locator("main [data-indicator-card]")).toHaveCount(2);
    await expect(page.locator("main [data-trend-chart] tbody tr")).toHaveCount(10);
    for (const indicator of await indicators.all()) {
      await expect(indicator.locator("[data-indicator-card]")).toHaveCount(1);
      await expect(indicator.locator("[data-trend-chart] tbody tr")).toHaveCount(5);
      await expect(indicator.locator(".why-it-matters")).toHaveCount(1);
      const sources = indicator.locator(".source-panel a[href^='https://pontianakkota.bps.go.id/']");
      expect(await sources.count()).toBeGreaterThan(0);
      const order = await indicator.locator("[data-indicator-card], [data-trend-chart], .why-it-matters, .source-panel")
        .evaluateAll((elements) => elements.map((element) => element.hasAttribute("data-indicator-card") ? "card" : element.hasAttribute("data-trend-chart") ? "chart" : element.classList.contains("why-it-matters") ? "context" : "source"));
      expect(order).toEqual(["card", "chart", "context", "source"]);
    }
    await expect(page.getByRole("heading", { name: /Batasan/i })).toBeVisible();
    for (const phrase of interpretation) await expect(page.getByText(phrase).first()).toBeVisible();
  });
}

test("employment uses August observations without substituting February", async ({ page }) => {
  await page.goto("pekerjaan/");
  await expect(page.locator("main")).not.toContainText(/Februari/i);
});
