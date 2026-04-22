import type { CSSProperties } from "react";

/**
 * 公式 X (旧 Twitter) ロゴの最小限 SVG パス。
 * Mathematical Double-Struck の `𝕏` がフォント依存で潰れがちな問題を
 * 解消するため、カード／チップ／バッジなど複数箇所から共用する。
 */
const X_LOGO_PATH =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";

type Props = {
  className?: string;
  style?: CSSProperties;
  /** デフォルトは currentColor。親テキスト色に追従させたいので基本は指定不要。 */
  fill?: string;
  /** em 単位で大きさを揃えたいときは font-size から 0.95em などで読み替え可能 */
  size?: number | string;
  title?: string;
};

export function XLogoIcon({
  className,
  style,
  fill = "currentColor",
  size,
  title,
}: Props) {
  const mergedStyle: CSSProperties = {
    width: size ?? "0.95em",
    height: size ?? "0.95em",
    flex: "none",
    ...style,
  };
  return (
    <svg
      className={className}
      style={mergedStyle}
      viewBox="0 0 24 24"
      fill={fill}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={X_LOGO_PATH} />
    </svg>
  );
}
