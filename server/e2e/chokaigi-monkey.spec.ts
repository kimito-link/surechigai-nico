import { expect, test } from "@playwright/test";

/**
 * モンキー: 疑似ランダム操作後もページが壊れていないことのみ検証（失敗は握りつぶし）
 */
test.describe("chokaigi モンキー（擬似ランダム）", () => {
  test("スクロール・Tab・summary/リンクのランダム操作で致命エラーなし", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/chokaigi", { waitUntil: "domcontentloaded" });

    const seed = 42;
    for (let i = 0; i < 35; i++) {
      const r = (seed + i * 17) % 1000;
      await page.mouse.wheel(0, (r % 500) - 250);

      const phase = r % 4;
      if (phase === 0) {
        const summaries = page.locator("summary");
        const n = await summaries.count();
        if (n > 0) {
          await summaries.nth(r % n).click({ timeout: 1500 }).catch(() => {});
        }
      } else if (phase === 1) {
        const internal = page.locator('a[href^="#"]');
        const n = await internal.count();
        if (n > 0) {
          await internal.nth(r % n).click({ timeout: 1500 }).catch(() => {});
        }
      } else if (phase === 2) {
        await page.keyboard.press("Tab").catch(() => {});
      } else {
        await page.mouse.click(120 + (r % 200), 200 + (r % 300)).catch(() => {});
      }
    }

    await expect(page.locator("h1")).toBeVisible();
    expect(
      pageErrors,
      `pageerror が発生: ${pageErrors.join(" | ")}`
    ).toHaveLength(0);
  });
});
