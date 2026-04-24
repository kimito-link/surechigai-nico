import { XOauthEntry } from "@/app/components/XOauthEntry";
import styles from "../../sign-in/[[...sign-in]]/page.module.css";

export default function SignUpPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.characterRow}>
          <div
            className={styles.character}
            style={{ backgroundImage: `url("/chokaigi/yukkuri/rink.png")` }}
            aria-hidden="true"
          />
          <div
            className={styles.character}
            style={{ backgroundImage: `url("/chokaigi/yukkuri/konta.png")` }}
            aria-hidden="true"
          />
          <div
            className={styles.character}
            style={{ backgroundImage: `url("/chokaigi/yukkuri/tanunee.png")` }}
            aria-hidden="true"
          />
        </div>
        <h1 className={styles.title}>すれちがいライト</h1>
        <p className={styles.lead}>Xアカウントで登録して始めよう</p>
        <XOauthEntry mode="sign-up" />
        <p className={styles.hint}>
          登録すると、会場ですれちがった人と<br />
          匿名でつながれます
        </p>
      </div>
    </main>
  );
}
