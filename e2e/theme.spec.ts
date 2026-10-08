import { expect, test, type Page } from "@playwright/test";

async function expectThemeControls(page: Page, dark: boolean) {
  const buttons = page.locator("[data-theme-toggle]");
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) {
    await expect(button.locator("[data-theme-label]")).toHaveText(dark ? "Gunakan mode terang" : "Gunakan mode gelap");
    await expect(button).toHaveAttribute("aria-pressed", String(dark));
    await expect(button.locator("svg")).toHaveCount(2);
    for (const icon of await button.locator("svg").all()) {
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      await expect(icon).toHaveAttribute("focusable", "false");
    }
    await expect(button.locator(`[data-theme-icon="${dark ? "moon" : "sun"}"]`)).toHaveCSS("display", "none");
    await expect(button.locator(`[data-theme-icon="${dark ? "sun" : "moon"}"]`)).toHaveCSS("display", "block");
  }
  const visibleButton = buttons.filter({ visible: true });
  await expect(visibleButton).toHaveAccessibleName(dark ? "Gunakan mode terang" : "Gunakan mode gelap");
  await expect(visibleButton.locator(`[data-theme-icon="${dark ? "sun" : "moon"}"]`)).toBeVisible();
}

test("system dark follows preference until an explicit choice persists across reload", async ({ page, isMobile }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
  if (isMobile) await page.locator("header details summary").click();
  await expect(page.locator("html")).toHaveClass(/theme-ready/);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveText("Gunakan mode terang");
  await expectThemeControls(page, true);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 26, 36)");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expectThemeControls(page, false);
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("light");
  await page.reload();
  if (isMobile) await page.locator("header details summary").click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expectThemeControls(page, false);
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("dark");
  await expectThemeControls(page, true);
  expect(errors).toEqual([]);
});

test("failed storage methods keep system theme readable and toggle operable", async ({ page, isMobile }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("storage read disabled"); };
    Storage.prototype.setItem = () => { throw new Error("storage write disabled"); };
  });
  await page.goto("./");
  if (isMobile) await page.locator("header details summary").click();
  const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expectThemeControls(page, true);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 26, 36)");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
  await expectThemeControls(page, false);
  expect(errors).toEqual([]);
});

test("invalid stored theme follows the system preference", async ({ page, isMobile }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("atlas-theme", "invalid"));
  await page.goto("./");
  if (isMobile) await page.locator("header details summary").click();
  await expect(page.locator("[data-theme-toggle]").filter({ visible: true })).toHaveAttribute("aria-pressed", "false");
  await expectThemeControls(page, false);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
  expect(errors).toEqual([]);
});

test("theme icons follow live system changes until the user chooses a theme", async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  if (isMobile) await page.locator("header details summary").click();
  await expectThemeControls(page, false);
  await page.emulateMedia({ colorScheme: "dark" });
  await expectThemeControls(page, true);
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBeNull();
  await page.locator("[data-theme-toggle]").filter({ visible: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expectThemeControls(page, false);
});

test("keyboard theme activation retains visible focus and persists through navigation", async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  if (isMobile) await page.locator("header details summary").click();
  const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expectThemeControls(page, true);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await expect(toggle).toHaveCSS("outline-width", "4px");
  await page.keyboard.press("Space");
  await expectThemeControls(page, false);
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("navigation", { name: isMobile ? "Navigasi utama seluler" : "Navigasi utama", exact: true }).getByRole("link", { name: "Harga", exact: true }).click();
  if (isMobile) await page.locator("header details summary").click();
  await expectThemeControls(page, true);
});

for (const width of [320, 384]) {
  test(`theme icons and labels fit the open mobile menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("./");
    await page.locator("header details summary").click();
    const toggle = page.locator("[data-theme-toggle]").filter({ visible: true });
    for (const dark of [false, true]) {
      await expectThemeControls(page, dark);
      const bounds = await toggle.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(await toggle.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (!dark) await toggle.click();
    }
  });
}
