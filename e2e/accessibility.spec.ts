import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

const ROUTES = [...PUBLIC_ROUTES, { path: "tidak-ditemukan/", heading: "Halaman tidak ditemukan" }];
const THEMES = ["light", "dark"] as const;
const controls = 'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

async function openMenuWithKeyboard(page: Page) {
  const menu = page.locator("header details");
  if (await menu.isVisible()) {
    const summary = menu.locator("summary");
    for (let count = 0; count < 12 && !await summary.evaluate((node) => node === document.activeElement); count++) {
      await page.keyboard.press("Tab");
    }
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("open", "");
  }
}

async function openSourcePanelsWithKeyboard(page: Page) {
  const closed = page.locator(".source-details:not([open])");
  for (let step = 0; step < 100 && await closed.count() > 0; step++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.matches(".source-details:not([open]) > summary"))) {
      await page.keyboard.press("Enter");
    }
  }
  await expect(closed).toHaveCount(0);
}

async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth })))
    .toEqual({ viewport: page.viewportSize()!.width, document: page.viewportSize()!.width });
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((choice) => localStorage.setItem("atlas-theme", choice), theme);
    });
    for (const route of ROUTES) {
      test(`${route.path} has accessible semantics, contrast, movement text, and table captions`, async ({ page }) => {
        const response = await page.goto(route.path);
        expect(response?.status()).toBe(route.path === "tidak-ditemukan/" ? 404 : 200);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("head title")).toHaveCount(1);
        await expect(page).toHaveTitle(/Atlas Ekonomi Pontianak/);
        if (route.path !== "./") await expect(page).toHaveTitle(new RegExp(route.heading));
        await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toHaveCount(1);
        await expect(page.locator("h1")).toHaveCount(1);
        const levels = await page.locator("h1,h2,h3,h4,h5,h6").evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
        expect(levels.filter((level, index) => index > 0 && level > levels[index - 1] + 1)).toEqual([]);
        for (const table of await page.locator("table").all()) {
          await expect(table.locator("caption")).toHaveCount(1);
          await expect(table.locator("caption")).not.toBeEmpty();
        }
        for (const card of await page.locator("[data-indicator-card]").all()) {
          const movement = card.locator(":scope > p").filter({ hasText: /^(naik|turun|tetap|meningkat|menurun)/i });
          await expect(movement).toHaveCount(1);
          await expect(movement).toContainText(/(poin persentase|ribu rupiah per orang per tahun)/i);
          await expect(movement).toContainText(/dibanding/i);
        }
        // Include the expanded native menu and its theme control in the audit.
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
        await openMenuWithKeyboard(page);
        const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(audit.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
      });

      for (const width of [320, 1280]) {
        test(`${route.path} keeps every interactive target large and visibly keyboard focused at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(route.path);
          await page.keyboard.press("Tab");
          const skip = page.getByRole("link", { name: "Lewati ke konten utama" });
          await expect(skip).toBeFocused();
          await page.keyboard.press("Enter");
          await expect(page.getByRole("main")).toBeFocused();
          await page.keyboard.press("Shift+Tab");
          // Reset traversal to the start, then open the native menu without a pointer.
          await page.goto(route.path);
          await page.keyboard.press("Tab");
          await openMenuWithKeyboard(page);
          await openSourcePanelsWithKeyboard(page);
          const visible = page.locator(controls).filter({ visible: true });
          for (const control of await visible.all()) {
            const bounds = await control.boundingBox();
            expect.soft(bounds?.width, `target width: ${await control.textContent()}`).toBeGreaterThanOrEqual(44);
            expect.soft(bounds?.height, `target height: ${await control.textContent()}`).toBeGreaterThanOrEqual(44);
          }
          await assertNoOverflow(page);
          // A complete keyboard cycle proves all visible controls participate in tab order.
          const seen = new Set<number>();
          const count = await visible.count();
          for (let step = 0; step < count + 5; step++) {
            await page.keyboard.press("Tab");
            const result = await page.evaluate((selector) => {
              const nodes = [...document.querySelectorAll<HTMLElement>(selector)].filter((node) => node.checkVisibility());
              const active = document.activeElement as HTMLElement;
              const index = nodes.indexOf(active);
              const style = getComputedStyle(active);
              return { index, outline: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor, focusVisible: active.matches(":focus-visible") };
            }, controls);
            if (result.index >= 0) {
              seen.add(result.index);
              expect.soft(result.focusVisible).toBe(true);
              expect.soft(result.outline).not.toBe("none");
              expect.soft(result.width).toBeGreaterThanOrEqual(2);
              expect.soft(result.color).not.toBe("rgba(0, 0, 0, 0)");
            }
          }
          expect(seen.size).toBe(count);
        });
      }

      test(`${route.path} reflows at 200% document zoom`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(route.path);
        // CSS document zoom changes layout; deviceScaleFactor only changes bitmap density.
        await page.locator("html").evaluate((node) => { node.style.zoom = "2"; });
        await expect(page.locator("html")).toHaveCSS("zoom", "2");
        await expect(page.locator("body")).toHaveCSS("width", "640px");
        await assertNoOverflow(page);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("main")).toBeFocused();
      });
    }

    test("keyboard operates header, native menu, theme, source links, and return to content", async ({ page }) => {
      await page.goto("harga/");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator(".site-brand")).toBeFocused();
      const menu = page.locator("header details");
      if (await menu.isVisible()) {
        await openMenuWithKeyboard(page);
        await page.keyboard.press("Enter");
        await expect(menu).not.toHaveAttribute("open", "");
        await page.keyboard.press("Space");
        await expect(menu).toHaveAttribute("open", "");
      }
      const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
      for (let step = 0; step < 12 && !await toggle.evaluate((node) => node === document.activeElement); step++) await page.keyboard.press("Tab");
      await expect(toggle).toBeFocused();
      await page.keyboard.press("Space");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme === "light" ? "dark" : "light");
      const source = page.locator(".source-panel a").first();
      for (let step = 0; step < 20 && !await source.evaluate((node) => node === document.activeElement); step++) await page.keyboard.press("Tab");
      await expect(source).toBeFocused();
      await expect(source).toHaveAttribute("href", /^https:\/\/pontianakkota\.bps\.go\.id\//);
      for (let step = 0; step < 30 && !await page.getByRole("link", { name: "Lewati ke konten utama" }).evaluate((node) => node === document.activeElement); step++) await page.keyboard.press("Shift+Tab");
      await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
    });

    test("reduced motion removes smooth scrolling and decorative timing", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const route of ROUTES) {
        await page.goto(route.path);
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
        const timings = await page.locator("body *").evaluateAll((nodes) => nodes.flatMap((node) => {
          const style = getComputedStyle(node);
          return [...style.transitionDuration.split(","), ...style.animationDuration.split(",")].map((time) => parseFloat(time));
        }));
        expect(Math.max(...timings)).toBeLessThanOrEqual(0.001);
      }
    });
  });

  test.describe(`JavaScript disabled, ${theme} system theme`, () => {
    test.use({ javaScriptEnabled: false, colorScheme: theme });
    for (const route of ROUTES) {
      test(`${route.path} retains readable, accessible core content`, async ({ page }) => {
        const response = await page.goto(route.path);
        expect(response?.status()).toBe(route.path === "tidak-ditemukan/" ? 404 : 200);
        await expect(page.locator("body")).toHaveCSS("background-color", theme === "light" ? "rgb(247, 243, 232)" : "rgb(8, 26, 36)");
        await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
        await expect(page.locator("[data-theme-toggle]").filter({ visible: true })).toHaveCount(0);
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("main")).toBeFocused();
        await page.goto(route.path);
        await page.keyboard.press("Tab");
        await openMenuWithKeyboard(page);
        await openSourcePanelsWithKeyboard(page);
        for (const table of await page.getByRole("table").all()) await expect(table).toBeVisible();
        for (const source of await page.locator(".source-panel a, [data-source-record] a").all()) await expect(source).toBeVisible();
        await page.setViewportSize({ width: 320, height: 900 });
        await assertNoOverflow(page);
      });
    }
  });
}
