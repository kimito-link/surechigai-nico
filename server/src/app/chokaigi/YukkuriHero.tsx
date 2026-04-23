"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import {
  yukkuriExplainedPagePath,
  yukkuriExplainedPageUrl,
  yukkuriShareClipboardBundle,
  yukkuriShareTweetText,
  yukkuriShareTweetUrl,
} from "@/lib/yukkuriShareUrls";
import {
  HERO_PILLAR_SURECHIGAI,
  HERO_PILLAR_YUKKURI,
  HERO_POST_EXPLAIN_SYNERGY,
  HERO_SYNERGY_DETAIL,
  HERO_SYNERGY_LEAD,
  HERO_SYNERGY_PRIVACY_NOTE,
  HERO_TITLE_MAIN,
  HERO_TITLE_SUB,
} from "./lp-content";
import { ChokaigiConceptBanner } from "./ChokaigiConceptBanner";
import styles from "./YukkuriHero.module.css";

type Dialogue = YukkuriDialogue;

const CHARS = [
  { key: "rink"    as const, label: "りんく",  src: "/chokaigi/yukkuri/rink.png",    color: "#ff7eb3" },
  { key: "konta"   as const, label: "こん太",  src: "/chokaigi/yukkuri/konta.png",   color: "#7ec8ff" },
  { key: "tanunee" as const, label: "たぬ姉", src: "/chokaigi/yukkuri/tanunee.png", color: "#a8e6a3" },
];

const BASE_URL = "https://surechigai-nico.link";

function buildTweetUrl(handle: string) {
  return yukkuriShareTweetUrl(BASE_URL, handle);
}

/**
 * ファーストビュー（超会議 2026 LP）のヒーロー。
 *
 * 設計意図（ファーストビュー v3）:
 *  - 「すれ違い通信」と「ゆっくり解説」を "同格の 2 本柱" として対等に並べる。
 *    ゆっくり解説は誰かを即席で名刺化できる文化（星野ロミさん的文脈のオマージュ）、
 *    すれ違い通信は企画の核。どちらも入口として機能する。
 *  - 2 本柱の下に「↕ 2 つはつながっている」シナジー文を置き、
 *    「解説された人が会場にいたら、すれ違いで見つかる」導線を言語化する。
 *  - 参加県は任意公開・デフォルト非公開。超会議の「〇〇から来た」を
 *    "見せたい人にだけ見せられる" 前提でコピーに書く（プライバシー配慮）。
 *
 * 解説実行中（`isTalking`）は全画面オーバーレイ（`.charsTalking`）に切り替わる。
 * オーバーレイ内では「解説を見た人 → すれ違い参加」導線を最強調にする。
 */
export function YukkuriHero() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [handle, setHandle] = useState("");
  const { dialogue, loading, error, explain, reset, cancelInFlight } = useYukkuriExplain();
  const [elapsedSec, setElapsedSec] = useState(0);
  /** X シェアボタン押下 → クリップボードに入れた直後の「コピーしました」表示トリガー */
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [loading]);

  /** サーバー描画の HeroStats を、解説 API 成功直後に再取得してチップの人数を更新する */
  useEffect(() => {
    if (!dialogue || loading) return;
    if (error) return;
    router.refresh();
  }, [dialogue, loading, error, router]);

  const raw = handle.trim().replace(/^@+/, "");
  const hasInput = raw.length > 0;
  const isTalking = Boolean(dialogue);

  const handleYukkuri = (e: FormEvent) => {
    e.preventDefault();
    if (!raw) return;
    void explain({ xHandle: raw, name: `@${raw}` });
  };

  /**
   * 「X でシェア（カード付き）」の onClick。
   *
   * 同じパターンを `YukkuriExplainedShareRow` でも使用している（共通化してもよいが、
   * 現状は handle の扱いが微妙に違うのでインラインで保持）。
   *
   * 挙動:
   *  1. 押した瞬間に「本文＋URL」をクリップボードに入れる
   *     → X の Windows/Mac デスクトップアプリが `intent/post` を空の composer で
   *       開く場合があるため、ユーザーが貼り付けだけで投稿できるようにする。
   *  2. モバイル等で `navigator.share` が使える場合はそちらを優先（ネイティブ共有シート）。
   *     `<a target="_blank">` のデフォルト遷移を `preventDefault` で止める。
   *  3. デスクトップは `<a href>` のデフォルト動作に任せて新規タブで intent URL を開く。
   */
  const handleShareClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!raw) return;
      // 重要: デフォルト遷移を先に止める。こうしないと X デスクトップアプリが
      // intent URL を先取りして起動し、クリップボード書き込みが間に合わず
      // 「空白の composer」で開かれる（Ctrl+V しても何も出ない）バグになる。
      e.preventDefault();

      // 1) クリップボード先入れ（await で書き込み完了を保証する）
      const bundle = yukkuriShareClipboardBundle(BASE_URL, raw);
      try {
        await navigator.clipboard.writeText(bundle);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2200);
      } catch {
        // クリップボード API が使えない環境（古い Safari / 非 HTTPS 等）。
        // フォールバック（後続の intent URL オープン）はそのまま動くので何もしない。
      }

      // 2) モバイル優先：ネイティブ共有シート
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `@${raw} のゆっくり解説`,
            text: yukkuriShareTweetText(raw),
            url: yukkuriExplainedPageUrl(BASE_URL, raw),
          });
          return;
        } catch {
          // キャンセル / 共有失敗：クリップボードに入っているので intent URL を手動で開く
        }
      }
      // 3) デスクトップ・または navigator.share 失敗時：
      //    クリップボード書き込み完了後に intent URL を明示的に新規タブで開く。
      window.open(buildTweetUrl(raw), "_blank", "noopener,noreferrer");
    },
    [raw]
  );

  return (
    <section className={styles.hero} aria-label="ゆっくり解説 × すれ違い通信 ヒーロー">
      {/* 背景: 日本列島（全国 → 幕張 → 全国）のコンセプトを視覚化 */}
      <ChokaigiConceptBanner />

      <div className={styles.heroContent}>
        {/* ====== ファーストビュー v3（解説開始前）====== */}
        {!isTalking && (
          <>
            <h1 className={styles.heroTitle}>{HERO_TITLE_MAIN}</h1>
            <p className={styles.heroTitleSub}>{HERO_TITLE_SUB}</p>

            <div className={styles.pillars}>
              {/* 柱①：ゆっくり解説 */}
              <article className={`${styles.pillar} ${styles.pillarYukkuri}`}>
                <header className={styles.pillarHeader}>
                  <span className={styles.pillarEmoji} aria-hidden="true">🎤</span>
                  <h2 className={styles.pillarTitle}>{HERO_PILLAR_YUKKURI.title}</h2>
                  <p className={styles.pillarSub}>{HERO_PILLAR_YUKKURI.sub}</p>
                </header>
                <p className={styles.pillarBody}>{HERO_PILLAR_YUKKURI.body}</p>

                {/* 3 人のアバターをコンパクトに並べる = カード内デコレーション。
                 *   解説中（isTalking）はこの帯は描画せず、全画面オーバーレイ側で
                 *   キャラが大きく喋る演出に切り替わる。 */}
                <div className={styles.pillarCharStrip} aria-hidden="true">
                  {CHARS.map(({ key, label, src, color }) => (
                    <div key={key} className={styles.pillarCharItem}>
                      <Image
                        src={src}
                        alt=""
                        width={60}
                        height={60}
                        className={styles.pillarCharImg}
                      />
                      <span
                        className={styles.pillarCharLabel}
                        style={{ background: color, color: "#0a0e1a" }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <form className={styles.form} onSubmit={handleYukkuri}>
                  <label className={styles.inputLabel}>
                    紹介してほしい人の X ID を入力
                  </label>
                  <div className={styles.inputRow}>
                    <span className={styles.at}>@</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="X ID（自分でも他の人でも OK）"
                      aria-label="X アカウントの ID"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.btnYukkuri}
                    disabled={loading || !hasInput}
                  >
                    {loading ? "解説中…" : "ゆっくり解説してもらう"}
                  </button>
                  {loading && (
                    <div className={styles.loadingRow}>
                      <p className={styles.loadingHint}>
                        生成中… {elapsedSec}秒経過（長い場合は数分かかることがあります）
                      </p>
                      <button
                        type="button"
                        className={styles.btnCancelExplain}
                        onClick={cancelInFlight}
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                  {!hasInput && (
                    <p className={styles.hint}>
                      誰の X ID でも解説できます。自分も、推しも、今日すれ違った誰かも。
                    </p>
                  )}
                </form>
              </article>

              {/* 柱②：すれ違い通信 */}
              <article className={`${styles.pillar} ${styles.pillarSurechigai}`}>
                <header className={styles.pillarHeader}>
                  <span className={styles.pillarEmoji} aria-hidden="true">📍</span>
                  <h2 className={styles.pillarTitle}>
                    {HERO_PILLAR_SURECHIGAI.title}
                  </h2>
                  <p className={styles.pillarSub}>{HERO_PILLAR_SURECHIGAI.sub}</p>
                </header>
                <p className={styles.pillarBody}>{HERO_PILLAR_SURECHIGAI.body}</p>

                <ul className={styles.pillarBullets}>
                  {HERO_PILLAR_SURECHIGAI.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>

                {isLoaded && !isSignedIn && (
                  <button
                    type="button"
                    className={styles.btnPillarPrimary}
                    onClick={() => router.push("/sign-in")}
                  >
                    {HERO_PILLAR_SURECHIGAI.ctaGuest} →
                  </button>
                )}
                {isLoaded && isSignedIn && (
                  <button
                    type="button"
                    className={styles.btnPillarPrimary}
                    onClick={() => router.push("/app")}
                  >
                    {HERO_PILLAR_SURECHIGAI.ctaSignedIn} →
                  </button>
                )}
                {!isLoaded && (
                  // Clerk ロード前のレイアウトガタつき防止プレースホルダ
                  <div className={styles.btnPillarPrimaryPlaceholder} aria-hidden="true" />
                )}
              </article>
            </div>

            {/* ↕ シナジー文帯：ここが「2 本柱は噛み合っている」思想の可視化 */}
            <section className={styles.synergyBand} aria-label="2 つの柱のつながり">
              <p className={styles.synergyLead}>↕ {HERO_SYNERGY_LEAD}</p>
              <p className={styles.synergyDetail}>{HERO_SYNERGY_DETAIL}</p>
              <p className={styles.synergyPrivacy}>{HERO_SYNERGY_PRIVACY_NOTE}</p>
            </section>
          </>
        )}

        {/* ====== 解説中（isTalking=true）: 全画面モーダル ====== */}
        {isTalking && dialogue && (
          <div className={`${styles.chars} ${styles.charsTalking}`}>
            {CHARS.map(({ key, label, src, color }, i) => {
              const isReverse = i % 2 === 1;
              return (
                <div
                  key={key}
                  className={`${styles.charCard} ${isReverse ? styles.charCardReverse : styles.charCardForward} ${styles[`charCardSpeak${i}`]}`}
                  style={{ animationDelay: `${i * 0.18}s` }}
                >
                  <div className={styles.charAvatarColumn}>
                    <div className={styles.charImgWrap}>
                      <Image
                        src={src}
                        alt={label}
                        width={100}
                        height={100}
                        className={styles.charImg}
                      />
                    </div>
                    <span
                      className={styles.charLabel}
                      style={{ background: color, color: "#0a0e1a" }}
                    >
                      {label}
                    </span>
                  </div>
                  <p
                    className={`${styles.charBubble} ${styles[`charBubble${i}`]} ${isReverse ? styles.charBubbleReverse : styles.charBubbleForward}`}
                  >
                    {dialogue[key]}
                  </p>
                </div>
              );
            })}

            <div className={styles.talkingFooter}>
              <p className={styles.canonicalPageNote}>
                この紹介は <strong>@{raw}</strong> 専用 URL に保存されています（同じ人を再解説すると本文が更新）。
              </p>
              <Link
                href={yukkuriExplainedPagePath(raw)}
                className={styles.canonicalPageLink}
              >
                紹介ページを開く →
              </Link>

              {/* シナジー誘導：解説体験 → すれ違い参加への最強導線 */}
              <p className={styles.postExplainSynergy}>
                {HERO_POST_EXPLAIN_SYNERGY.replace("{handle}", raw)}
              </p>

              <div className={styles.shareRow}>
                {isLoaded && !isSignedIn && (
                  <button
                    type="button"
                    className={styles.btnSurechigaiCta}
                    onClick={() => router.push("/sign-in")}
                    title="位置の交換ですれ違い検出。いいね・オフ会のきっかけにも"
                  >
                    すれ違いに参加（X でログイン）
                  </button>
                )}
                {isLoaded && isSignedIn && (
                  <button
                    type="button"
                    className={styles.btnSurechigaiCta}
                    onClick={() => router.push("/app")}
                  >
                    ダッシュボードへ
                  </button>
                )}
                <a
                  href={buildTweetUrl(raw)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.shareBtn}
                  onClick={handleShareClick}
                >
                  {shareCopied
                    ? "コピーしました！X で貼り付け OK"
                    : "X でシェア（カード付き）"}
                </a>
                <button
                  type="button"
                  className={styles.btnResetExplain}
                  onClick={() => {
                    reset();
                    setHandle("");
                  }}
                >
                  別の人を解説
                </button>
              </div>
              <p className={styles.shareHint}>
                X アプリで空白のまま開いた場合は、<strong>そのまま貼り付け</strong>で OK（本文＋URL はコピー済み）。
              </p>
            </div>
          </div>
        )}

        {/* エラー（ファーストビュー側・オーバーレイ外にだけ出す） */}
        {error && !isTalking && (
          <div className={styles.errorBlock}>
            <p className={styles.error} role="alert">
              {error}
            </p>
            <button
              type="button"
              className={styles.btnRetryExplain}
              onClick={() => {
                reset();
                if (raw) void explain({ xHandle: raw, name: `@${raw}` });
              }}
            >
              再試行
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
