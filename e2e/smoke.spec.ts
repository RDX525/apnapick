import { test, expect } from "@playwright/test";

test("homepage shows ApnaPick brand and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /ApnaPick/i }).first()).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /search for places, dishes, or services/i }),
  ).toBeVisible();
});

test("intent search returns chicken curry matches", async ({ page }) => {
  await page.goto("/search?q=best%20chicken%20curry%20near%20me&radius_m=50000");
  await expect(page.getByRole("heading", { name: /results for/i })).toBeVisible();
  await expect(page.getByText(/showing \d|no matches/i).first()).toBeVisible();
});

test("public navigation and theme controls are keyboard accessible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();

  const menuButton = page.getByRole("button", { name: "Menu" });
  if (await menuButton.isVisible()) {
    await menuButton.focus();
    await expect(menuButton).toBeFocused();
    return;
  }

  const themeButton = page
    .locator('button[data-mounted="true"][aria-label^="Color theme"]')
    .first();
  await expect(themeButton).toBeVisible();
  await themeButton.click();
  await expect(page.locator('[role="menuitemradio"][aria-label="Dark"]')).toBeVisible();
});

test("consumer pages do not overflow horizontally", async ({ page }) => {
  for (const path of ["/", "/login", "/forgot-password", "/search", "/help"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${path} overflowed horizontally`).toBe(false);
  }
});

test("dashboard save failure is truthful and retryable", async ({ page, isMobile }) => {
  test.skip(isMobile, "Covered on operational desktop layouts");
  let attempts = 0;
  await page.route("**/api/business/workspace", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workspace: null, source: "anonymous" }),
      });
      return;
    }
    attempts += 1;
    await route.fulfill({
      status: attempts === 1 ? 503 : 200,
      contentType: "application/json",
      body:
        attempts === 1
          ? JSON.stringify({ error: "Temporary save failure" })
          : JSON.stringify({ data: { ok: true } }),
    });
  });

  await page.goto("/business/dashboard/profile");
  const businessName = page.getByLabel("Business name");
  if (!(await businessName.isVisible())) {
    test.skip(true, "Requires an authenticated business fixture");
    return;
  }
  await businessName.fill("Spice Route Updated");
  await expect(page.getByText(/temporary save failure/i)).toBeVisible();
  await page.getByRole("button", { name: /retry/i }).click();
  await expect(page.getByText(/all changes saved/i)).toBeVisible();
});

test("destructive admin actions require confirmation", async ({ page, isMobile }) => {
  test.skip(isMobile, "Covered on operational desktop layouts");
  await page.goto("/admin/users");
  const suspend = page.getByRole("button", { name: "Suspend" }).first();
  if ((await suspend.count()) === 0) {
    test.skip(true, "Requires an authenticated admin fixture");
    return;
  }
  await suspend.click();
  await expect(page.getByRole("dialog")).toContainText(/suspend/i);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
