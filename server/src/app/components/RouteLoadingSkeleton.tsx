import styles from "./RouteLoadingSkeleton.module.css";

type Props = {
  /** スクリーンリーダー向け（視覚はプレースホルダのみ） */
  label: string;
};

/** ルート segment の loading.tsx 用・軽量プレースホルダ */
export function RouteLoadingSkeleton({ label }: Props) {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div className={styles.bar} aria-hidden="true" />
      <div className={styles.barWide} aria-hidden="true" />
      <div className={styles.barShort} aria-hidden="true" />
      <div className={styles.block} aria-hidden="true" />
      <div className={styles.block} aria-hidden="true" />
    </div>
  );
}
