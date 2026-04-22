import { expect, test } from "@playwright/test";
import {
  EXPERIENCE_SECTION_TITLE,
  HERO_HEADING,
  JAPAN_LOCATOR_TITLE,
  MAP_HALL_LIST_TITLE,
  MAP_SECTION_TITLE,
  USAGE_SECTION_TITLE,
  VENUE_SECTION_TITLE,
  YUKKURI_DIALOGUE_TITLE,
} from "../src/app/chokaigi/lp-content";

async function gotoChokaigiWithRetry(page: import("@playwright/test").Page) {
  let lastStatus: number | undefined;
  for (let i = 0; i < 3; i += 1) {
    const res = await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
    lastStatus = res?.status();
    if (lastStatus === 200) return 200;
    if (lastStatus !== 404) break;
    await page.waitForTimeout(800);
  }
  return lastStatus;
}

/**
 * スモーク: 各ビューポートで「開いて主要ブロックが見える」までを最短で検証
 */
test.describe("chokaigi スモーク", () => {
  test("200・ヒーロー〜ゆっくり〜会場〜マップの骨格が見える", async ({
    page,
  }) => {
    const status = await gotoChokaigiWithRetry(page);
    expect(status).toBe(200);

    await expect(page.locator("h1")).toHaveText(HERO_HEADING);

    await expect(
      page.getByRole("heading", { name: YUKKURI_DIALOGUE_TITLE, level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: EXPERIENCE_SECTION_TITLE, level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: USAGE_SECTION_TITLE, level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: VENUE_SECTION_TITLE, level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: MAP_SECTION_TITLE, level: 2 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: JAPAN_LOCATOR_TITLE, level: 3 })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: MAP_HALL_LIST_TITLE, level: 3 })
    ).toBeVisible();

    const yukkuriRegion = page.getByRole("region", {
      name: /りんく・こん太・たぬ姉/,
    });
    await expect(yukkuriRegion).toBeVisible();
    await expect(yukkuriRegion.locator('[data-speaker="rink"]').first()).toBeVisible();
  });
});
