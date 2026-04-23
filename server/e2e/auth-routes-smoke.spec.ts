import { expect, test } from "@playwright/test";

/** 認証周辺の loading 境界を通った後も 200 で描画されることのスモーク */
test.describe("認証・オンボーディング周辺", () => {
  test("/sign-in が 200", async ({ page }) => {
    const res = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "すれちがいライト" })).toBeVisible();
  });

  test("/sign-up が 200", async ({ page }) => {
    const res = await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "すれちがいライト" })).toBeVisible();
  });

  test("/logged-out が 200", async ({ page }) => {
    const res = await page.goto("/logged-out", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "ログアウトしました" })).toBeVisible();
  });
});
