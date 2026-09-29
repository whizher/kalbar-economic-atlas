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
