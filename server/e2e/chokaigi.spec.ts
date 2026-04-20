import { expect, test } from "@playwright/test";
import {
  HERO_HEADING,
  MAP_HALL_LIST_TITLE,
  MAP_PDF_DESKTOP_DETAILS_SUMMARY,
  MAP_PDF_PRIMARY_CTA_LABEL,
  MAP_PDF_TITLE,
  MAP_SECTION_TITLE,
  VENUE_MAP_PDF_PATH,
} from "../src/app/chokaigi/lp-content";

const PDF_IFRAME_TITLE = "ニコニコ超会議 会場マップ（PDF）";

test.describe("超会議 LP /chokaigi", () => {
  test("200・ヒーローとマップ見出しが表示される", async ({ page }) => {
    const res = await page.goto("/chokaigi");
    expect(res?.ok()).toBeTruthy();

    await expect(page.locator("h1")).toHaveText(HERO_HEADING);
    await expect(
      page.getByRole("heading", { name: MAP_SECTION_TITLE, level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: MAP_PDF_TITLE, level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: MAP_HALL_LIST_TITLE, level: 3 })
    ).toBeVisible();
  });

  test("公式PDFの主CTAが正しいパスを指す", async ({ page }) => {
    await page.goto("/chokaigi");
    const primary = page.getByRole("link", { name: MAP_PDF_PRIMARY_CTA_LABEL });
    await expect(primary).toBeVisible();
    const href = await primary.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain(VENUE_MAP_PDF_PATH);
  });
});

test.describe("PDF 埋め込み（PdfDesktopEmbed）", () => {
  test("デスクトップ幅では details 内に iframe があり、開くと表示される", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/chokaigi");
    const frame = page.locator(`iframe[title="${PDF_IFRAME_TITLE}"]`);
    await expect(frame).toHaveCount(1, { timeout: 15_000 });
    await expect(frame).toHaveAttribute("src", VENUE_MAP_PDF_PATH);

    await page
      .locator("summary")
      .filter({ hasText: MAP_PDF_DESKTOP_DETAILS_SUMMARY })
      .click();
    await expect(frame).toBeVisible();
  });

  test("モバイル幅では iframe がDOMにない（埋め込み非表示）", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/chokaigi");
    const frame = page.locator(`iframe[title="${PDF_IFRAME_TITLE}"]`);
    await expect(frame).toHaveCount(0);
  });
});
