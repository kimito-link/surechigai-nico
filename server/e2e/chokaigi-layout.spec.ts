import { expect, test, type Page } from "@playwright/test";

/**
 * SiteHeader の二重ナビ・ロゴ暴走・リンク密着を検出するレイアウト検証。
 * 実行例: npx playwright test e2e/chokaigi-layout.spec.ts
 *
 * networkidle は HMR / 長時間ポーリングで不安定なため、DOM＋主要要素の表示で待機する。
 */
async function gotoChokaigiReady(page: Page) {
  await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("banner")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("main article h1").first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("chokaigi ヘッダーレイアウト", () => {
  test.describe.configure({ retries: 2 });

  test("デスクトップ: メインナビ1系・リンクが横に分離・ロゴ高さが抑えられる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoChokaigiReady(page);

    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();

    const logo = banner.locator("img").first();
    await expect(logo).toBeVisible();
    const logoBox = await logo.boundingBox();
    expect(logoBox?.height, "ヘッダーロゴが縦に異常拡大していない").toBeLessThanOrEqual(
      52
    );

    const mainNav = page.getByRole("navigation", { name: "メインメニュー" });
    await expect(mainNav).toBeVisible();

    const homeVisible = banner
      .getByRole("link", { name: "ホーム", exact: true })
      .filter({ visible: true });
    await expect(
      homeVisible,
      "「ホーム」が同時に複数表示されていない"
    ).toHaveCount(1);

    const navLinks = mainNav.getByRole("link");
    await expect(navLinks).toHaveCount(3);
    await expect(navLinks.nth(0)).toBeVisible();
    await expect(navLinks.nth(1)).toBeVisible();
    const a = await navLinks.nth(0).boundingBox();
    const b = await navLinks.nth(1).boundingBox();
    expect(a && b, "ナビリンクの座標が取れる").toBeTruthy();
    expect(
      b!.x,
      "ナビ2件目が1件目の右側にあり、一続きのテキストになっていない"
    ).toBeGreaterThan(a!.x + a!.width * 0.5);
  });

  test("モバイル幅: デスクトップ用ナビは非表示・ハンバーガー表示・ホームリンクの同時表示は1以下", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoChokaigiReady(page);

    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();

    await expect(
      page.getByRole("navigation", { name: "メインメニュー" })
    ).not.toBeVisible();

    await expect(
      page.getByRole("button", { name: /メニューを開く|メニューを閉じる/ })
    ).toBeVisible();

    const homeVisible = banner
      .getByRole("link", { name: "ホーム", exact: true })
      .filter({ visible: true });
    expect(
      await homeVisible.count(),
      "ドロワー閉じ時に「ホーム」が複数見えていない"
    ).toBeLessThanOrEqual(1);
  });

  test("768px: タブレット幅でもデスクトップナビは出さずハンバーガー", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await gotoChokaigiReady(page);

    await expect(
      page.getByRole("navigation", { name: "メインメニュー" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /メニューを開く|メニューを閉じる/ })
    ).toBeVisible();
  });
});
