import { test } from "@playwright/test";

/**
 * レスポンシブ確認用（手動レビュー向け）。出力は screenshots/（.gitignore）。
 * 実行: npx playwright test e2e/chokaigi-screenshots.spec.ts --project=desktop-chrome
 */
test.describe("chokaigi スクリーンショット", () => {
  test("375×812 フルページ", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/chokaigi", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/chokaigi-mobile.png", fullPage: true });
  });

  test("768×1024 フルページ", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/chokaigi", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/chokaigi-tablet.png", fullPage: true });
  });

  test("1280×800 フルページ", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/chokaigi", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/chokaigi-desktop.png", fullPage: true });
  });

  test("320×568 フルページ", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/chokaigi", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/chokaigi-320.png", fullPage: true });
  });

  test("280×480 フルページ", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 480 });
    await page.goto("/chokaigi", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/chokaigi-280.png", fullPage: true });
  });

  test("詳細マップ開いた状態（320幅・detailsのみ）", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.locator("summary:has-text('詳細マップを表示')").click();
    await page.waitForTimeout(1000);
    await page.locator("details:has-text('詳細マップを表示')").screenshot({
      path: "screenshots/map-section-320.png",
    });
  });

  test("詳細マップ開いた状態（1280幅・detailsのみ）", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.locator("summary:has-text('詳細マップを表示')").click();
    await page.waitForTimeout(1000);
    await page.locator("details:has-text('詳細マップを表示')").screenshot({
      path: "screenshots/map-pc-1280.png",
    });
  });
});
