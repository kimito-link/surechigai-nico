import Link from "next/link";
import styles from "./logged-out.module.css";

export default function LoggedOutPage() {
  return (
    <main className={styles.bg}>
      <div className={styles.card}>
        <div className={styles.characters}>
          <div className={styles.charItem}>
            <img src="/chokaigi/yukkuri/rink.png" alt="りんく" />
            <div className={styles.bubble}>またね〜✨</div>
          </div>
          <div className={styles.charItem}>
            <img src="/chokaigi/yukkuri/konta.png" alt="こんた" />
            <div className={styles.bubble}>またね！</div>
          </div>
          <div className={styles.charItem}>
            <img src="/chokaigi/yukkuri/tanunee.png" alt="たぬね" />
            <div className={styles.bubble}>またね〜</div>
          </div>
        </div>

        <div className={styles.icon}>✓</div>

        <h1 className={styles.title}>ログアウトしました</h1>
        <p className={styles.subtitle}>
          すれちがいライトからログアウトしました
        </p>

        <div className={styles.infoBox}>
          <p>
            <strong>💡 またいつでもどうぞ</strong>
            次回は X / Twitter アカウントで
            すぐにログインできます。
          </p>
        </div>

        <div className={styles.actions}>
          <Link href="/sign-in" className={styles.btnPrimary}>
            ログイン
          </Link>
          <Link href="/chokaigi" className={styles.btnSecondary}>
            超会議ページへ
          </Link>
        </div>
      </div>
    </main>
  );
}
