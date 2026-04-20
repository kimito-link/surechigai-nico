import { expect, test } from "@playwright/test";
import {
  HERO_HEADING,
  MAP_PDF_DESKTOP_DETAILS_SUMMARY,
  MAP_PDF_PRIMARY_CTA_LABEL,
  VENUE_MAP_PDF_PATH,
  YUKKURI_DIALOGUE_TITLE,
} from "../src/app/chokaigi/lp-content";

const PDF_IFRAME_TITLE = "ニコニコ超会議 会場マップ（PDF）";

/**
 * 全体フロー: スクロール・アンカー・PDF・概略図（レスポンシブ差分あり）
 */
test.describe("chokaigi フロー", () => {
  test("上から下へ: ヒーロー → ゆっくり立ち絵 → アンカーで戻る → 概略図", async ({
    page,
  }) => {
    await page.goto("/chokaigi");

    await expect(page.locator("h1")).toHaveText(HERO_HEADING);

    const yukkuriHeading = page.getByRole("heading", {
      name: YUKKURI_DIALOGUE_TITLE,
      level: 2,
    });
    await yukkuriHeading.scrollIntoViewIfNeeded();
    await expect(yukkuriHeading).toBeInViewport();

    await expect(
      page.locator('article[data-speaker="rink"]').first()
    ).toBeVisible();

    const jumpYukkuri = page.locator('a[href="#yukkuri-dialogue-heading"]');
    await jumpYukkuri.scrollIntoViewIfNeeded();
    await jumpYukkuri.click();
    await expect(yukkuriHeading).toBeInViewport();

    const schematicLabel = page.getByText("地図イメージを表示", { exact: false });
    await schematicLabel.scrollIntoViewIfNeeded();
    await expect(schematicLabel).toBeVisible();
  });

  test("デスクトップ: PDF CTA・details で iframe", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/chokaigi");

    const primary = page.getByRole("link", { name: MAP_PDF_PRIMARY_CTA_LABEL });
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeVisible();
    const href = await primary.getAttribute("href");
    expect(href).toContain(VENUE_MAP_PDF_PATH);

    const frame = page.locator(`iframe[title="${PDF_IFRAME_TITLE}"]`);
    /* PdfDesktopEmbed は CSR で matchMedia 後にマウント */
    await expect(frame).toHaveCount(1, { timeout: 25_000 });
    await page
      .locator("summary")
      .filter({ hasText: MAP_PDF_DESKTOP_DETAILS_SUMMARY })
      .click();
    await expect(frame).toBeVisible();
  });

  test("モバイル: iframe なし・概略トグル操作", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/chokaigi");

    await expect(
      page.locator(`iframe[title="${PDF_IFRAME_TITLE}"]`)
    ).toHaveCount(0);

    const toggle = page.locator("#chokaigi-svg-toggle");
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toBeChecked();
  });
});
