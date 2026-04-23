import { expect, test } from "@playwright/test";

test.describe("スキップリンクとメインランドマーク", () => {
  test("トップ: メインコンテンツへ・#main-content", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    const skip = page.getByRole("link", { name: "メインコンテンツへ" });
    await expect(skip).toHaveAttribute("href", "#main-content");

    const mainRegion = page.locator("#main-content");
    await expect(mainRegion).toHaveCount(1);

    await skip.focus();
    await expect(skip).toBeFocused();
  });

  test("超会議LP: スキップリンクが存在する", async ({ page }) => {
    const res = await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    await expect(
      page.getByRole("link", { name: "メインコンテンツへ" })
    ).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toHaveCount(1);
  });
});
