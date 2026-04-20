import { expect, test } from "@playwright/test";

test.describe("ルート /", () => {
  test("200・ヒーローと3人のガイド・/chokaigi への導線", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    await expect(page.locator("h1")).toContainText("すれちがいライト");
    await expect(
      page.getByRole("heading", { name: "すれ違い通信のひとこと", level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "3人のゆっくりガイド", level: 2 })
    ).toBeVisible();

    await expect(page.getByText("りんく").first()).toBeVisible();
    await expect(page.getByText("こん太").first()).toBeVisible();
    await expect(page.getByText("たぬ姉").first()).toBeVisible();

    await expect(page.getByText(/すれちがうイメージ（示意・ループ）/)).toBeVisible();

    const lp = page.getByRole("link", {
      name: /ニコニコ超会議 企画予告/,
    });
    await expect(lp).toBeVisible();
    await expect(lp).toHaveAttribute("href", "/chokaigi");

    const usageDetail = page.getByRole("link", {
      name: /すれ違い通信の使いかた/,
    });
    await expect(usageDetail).toBeVisible();
    await expect(usageDetail).toHaveAttribute("href", "/chokaigi#usage-heading");
  });
});
