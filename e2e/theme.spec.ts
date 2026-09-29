import { expect, test } from "@playwright/test";

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
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 26, 36)");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("light");
  await page.reload();
  if (isMobile) await page.locator("header details summary").click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("dark");
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 26, 36)");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
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
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 243, 232)");
  expect(errors).toEqual([]);
});
