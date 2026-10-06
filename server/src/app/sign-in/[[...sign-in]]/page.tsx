import { XOauthEntry } from "@/app/components/XOauthEntry";
import styles from "./page.module.css";

export default function SignInPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        {/* CSP対応: キャラ画像はインライン style ではなく data-character + CSS 固定クラスで指定 */}
        <div className={styles.characterRow}>
          <div className={styles.character} data-character="rink" aria-hidden="true" />
          <div className={styles.character} data-character="konta" aria-hidden="true" />
          <div className={styles.character} data-character="tanunee" aria-hidden="true" />
        </div>
        <h1 className={styles.title}>すれちがいライト</h1>
        <p className={styles.lead}>Xアカウントでログインして始めよう</p>
        <XOauthEntry mode="sign-in" />
        <p className={styles.hint}>
          ログインすると、会場ですれちがった人と<br />
          匿名でつながれます
        </p>
      </div>
    </main>
  );
}
