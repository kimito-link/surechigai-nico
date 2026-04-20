/**
 * ニコニコ超会議向け LP の契約テスト（ファイル内容ベース）。
 * node --test で実行。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");
const lpContentPath = join(serverRoot, "src/app/chokaigi/lp-content.ts");
const pagePath = join(serverRoot, "src/app/chokaigi/page.tsx");
const pdfDesktopEmbedPath = join(serverRoot, "src/app/chokaigi/PdfDesktopEmbed.tsx");
const layoutPath = join(serverRoot, "src/app/chokaigi/layout.tsx");
const ogImagePath = join(serverRoot, "src/app/chokaigi/opengraph-image.tsx");
const jsonLdPath = join(serverRoot, "src/app/chokaigi/ChokaigiJsonLd.tsx");
const nextConfigPath = join(serverRoot, "next.config.ts");

test("lp-content.ts が存在し、必須キーワードと canonical ベースを含む", () => {
  assert.ok(existsSync(lpContentPath), "src/app/chokaigi/lp-content.ts が必要です");
  const src = readFileSync(lpContentPath, "utf8");
  assert.match(src, /export const LP_TITLE/, "LP_TITLE を export してください");
  assert.match(src, /export const LP_DESCRIPTION/, "LP_DESCRIPTION を export してください");
  assert.match(src, /CANONICAL_PATH/, "CANONICAL_PATH を定義してください");
  assert.ok(
    src.includes('"/chokaigi"'),
    "canonical パスは /chokaigi（Next 既定・末尾スラッシュなし）にしてください"
  );
  assert.ok(
    src.includes("りんく") && src.includes("こん太") && src.includes("たぬ姉"),
    "ガイド3体（りんく・こん太・たぬ姉）の言及を含めてください"
  );
});

test("page.tsx が存在し、レスポンシブ・メタ・構造化の土台を含む", () => {
  assert.ok(existsSync(pagePath), "src/app/chokaigi/page.tsx が必要です");
  const src = readFileSync(pagePath, "utf8");
  assert.ok(src.includes("viewport") || src.includes("layout.tsx"), "viewport は layout または page で扱ってください");
  assert.ok(src.includes("lp-content") || src.includes("LP_TITLE"), "lp-content からコピーを import してください");
  assert.ok(src.includes("chokaigi") && src.includes("module.css"), "chokaigi.module.css を参照してください");
  assert.ok(src.includes("PdfDesktopEmbed"), "PDF iframe はデスクトップ専用コンポーネントで制御してください");
  assert.ok(src.includes('download="chokaigi2026_map.pdf"'), "PDF 保存導線を維持してください");
  assert.ok(!src.includes("index.html"), "リンクは /chokaigi/... 形式で統一し、index.html を使わないでください");
});

test("PdfDesktopEmbed.tsx が存在し、iframe title を維持する", () => {
  assert.ok(existsSync(pdfDesktopEmbedPath), "src/app/chokaigi/PdfDesktopEmbed.tsx が必要です");
  const src = readFileSync(pdfDesktopEmbedPath, "utf8");
  assert.ok(src.includes('title="ニコニコ超会議 会場マップ（PDF）"'), "iframe の title 属性を維持してください");
});

test("chokaigi/layout.tsx で viewport / themeColor / メタデータを定義する", () => {
  assert.ok(existsSync(layoutPath), "src/app/chokaigi/layout.tsx が必要です");
  const src = readFileSync(layoutPath, "utf8");
  assert.ok(src.includes("viewport"), "viewport を export してください");
  assert.ok(src.includes("metadata") || src.includes("Metadata"), "metadata を定義してください");
  assert.ok(src.includes("alternates") && src.includes("canonical"), "canonical URL を alternates で指定してください");
  assert.ok(
    src.includes("metadataBase") && src.includes("siteOrigin"),
    "OG 絶対URL用に metadataBase と siteOrigin を使ってください"
  );
  assert.ok(
    src.includes("ChokaigiJsonLd") || src.includes("application/ld+json"),
    "JSON-LD（ChokaigiJsonLd 等）を含めてください"
  );
});

test("opengraph-image.tsx と ChokaigiJsonLd.tsx が存在する", () => {
  assert.ok(existsSync(ogImagePath), "src/app/chokaigi/opengraph-image.tsx が必要です");
  const og = readFileSync(ogImagePath, "utf8");
  assert.match(og, /ImageResponse/, "next/og の ImageResponse を使ってください");
  assert.ok(existsSync(jsonLdPath), "src/app/chokaigi/ChokaigiJsonLd.tsx が必要です");
  const jd = readFileSync(jsonLdPath, "utf8");
  assert.match(jd, /"@type":\s*"Event"/, "schema.org Event の JSON-LD を含めてください");
});

test("next.config に /chokaigi ↔ /chokaigi/ の redirects がない（ループ防止）", () => {
  assert.ok(existsSync(nextConfigPath));
  const src = readFileSync(nextConfigPath, "utf8");
  const hasChokaigiSlashRedirect =
    /source:\s*["']\/chokaigi["']/.test(src) &&
    /destination:\s*["']\/chokaigi\/["']/.test(src);
  assert.ok(
    !hasChokaigiSlashRedirect,
    "/chokaigi → /chokaigi/ の redirects は Next のパス正規化と衝突します（削除済みであること）"
  );
});
