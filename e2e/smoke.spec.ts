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
