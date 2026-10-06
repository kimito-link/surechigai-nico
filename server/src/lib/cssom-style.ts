import type { RefCallback } from "react";

/**
 * CSP (style-src 'self'、unsafe-inline なし) 対応用ヘルパー。
 *
 * React の `style={{...}}` は SSR 時に HTML の `style="..."` 属性として出力され、
 * 厳格な CSP ではブロックされる（`style={{ "--var": v }}` の CSS 変数も同様）。
 * 一方、JS から CSSOM 経由で `element.style.setProperty()` するのは
 * CSP の style-src の制限対象外。
 *
 * そこで「連続的に変化する値」（座標・進捗率・アニメ遅延・任意画像URL 等）は、
 * render 結果ではなくコミット時の副作用（callback ref）で DOM に直接書き込む。
 * callback ref はインラインで渡すと毎レンダーごとに再実行されるため、
 * 値が変わればその都度反映される（useRef + useEffect と同等で、ペイント前に走る分ちらつきが少ない）。
 *
 * 使い方:
 *   <div ref={cssomStyle({ width: `${pct}%` })} />
 *
 * プロパティ名は CSS の kebab-case（例: "background-image", "animation-delay", "z-index"）。
 * null / undefined / "" を渡したプロパティは removeProperty される。
 *
 * 注意: SSR の HTML には値が含まれないため、ハイドレーション完了までは
 * CSS Modules 側の既定値で表示される。初期表示に必須な見た目は CSS 側に既定値を置くこと。
 */
export type CssomStyleMap = Record<string, string | number | null | undefined>;

export function cssomStyle<T extends HTMLElement | SVGElement = HTMLElement>(
  styles: CssomStyleMap
): RefCallback<T> {
  return (el) => {
    if (!el) return;
    applyCssomStyle(el, styles);
  };
}

export function applyCssomStyle(el: HTMLElement | SVGElement, styles: CssomStyleMap): void {
  for (const [prop, value] of Object.entries(styles)) {
    if (value === null || value === undefined || value === "") {
      el.style.removeProperty(prop);
    } else {
      el.style.setProperty(prop, String(value));
    }
  }
}
