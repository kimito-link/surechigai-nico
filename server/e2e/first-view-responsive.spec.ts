import { expect, test, type Page } from "@playwright/test";

/** ヘッド付きで目視しやすいよう、同一ファイル内でビューポートを順に切り替える（並列だとウィンドウが増えすぎる） */
test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { width: 280, height: 480, name: "極窄280" },
  { width: 320, height: 568, name: "SE相当320" },
  { width: 375, height: 812, name: "モバイル375" },
  { width: 390, height: 844, name: "Pixel系390" },
  { width: 768, height: 1024, name: "タブレット768" },
  { width: 1280, height: 900, name: "デスクトップ1280" },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const ok = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
  );
  expect(ok, "横スクロールバーが出ていない（幅オーバーなし）").toBeTruthy();
}

test.describe("ルート / ファーストビュー", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name}（${vp.width}×${vp.height}）: 主要ブロックが見え横はみ出しなし`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(res?.status()).toBe(200);

      await expect(page.locator("main.shell")).toBeVisible({ timeout: 45_000 });
      await expect(
        page.locator('[aria-label="参加状況サマリー"]')
      ).toBeVisible({ timeout: 15_000 });
      const yukkuriHero = page.locator('section[aria-label="ゆっくり解説ヒーロー"]');
      await expect(yukkuriHero).toBeVisible({ timeout: 15_000 });

      await assertNoHorizontalOverflow(page);

      const heroBox = await yukkuriHero.boundingBox();
      expect(heroBox, "ゆっくりヒーロー領域の座標が取れる").toBeTruthy();
      expect(
        heroBox!.height,
        "ゆっくりヒーローが極端に潰れていない（最低いくらかの高さ）"
      ).toBeGreaterThanOrEqual(Math.min(160, vp.height * 0.18));
    });
  }
});

test.describe("/chokaigi ファーストビュー", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name}（${vp.width}×${vp.height}）: ヘッダーと本文が見え横はみ出しなし`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("banner")).toBeVisible({ timeout: 45_000 });
      await expect(page.locator("main article h1").first()).toBeVisible({
        timeout: 30_000,
      });
      await assertNoHorizontalOverflow(page);
    });
  }
});
