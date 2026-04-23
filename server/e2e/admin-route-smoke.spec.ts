import { expect, test } from "@playwright/test";

test.describe("/admin", () => {
  test("200・未ログインは sign-in へ／ログイン済みなら管理 UI または案内", async ({
    page,
  }) => {
    const res = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    await expect(page.locator("#main-content")).toBeVisible();

    const clerkSignIn = page.getByText("Xアカウントでログインして始めよう");
    const dashboard = page.getByRole("heading", {
      name: "すれちがいライト 管理ダッシュボード",
    });
    const innerLoading = page.getByText("読み込み中...");
    const authNeeded = page.getByText("管理者認証が必要");
    const apiUnset = page.getByText("管理 API が未設定");

    await expect(
      clerkSignIn.or(dashboard).or(innerLoading).or(authNeeded).or(apiUnset)
    ).toBeVisible({ timeout: 25_000 });
  });
});
