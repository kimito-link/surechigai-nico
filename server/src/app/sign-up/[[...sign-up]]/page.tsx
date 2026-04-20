import { SignUp } from "@clerk/nextjs";
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
        <SignUp
          appearance={{
            elements: {
              rootBox: styles.clerkRoot,
              card: styles.clerkCard,
              header: styles.clerkHidden,
              socialButtonsBlockButton: styles.clerkSocialButton,
              footer: styles.clerkFooter,
              footerAction: styles.clerkFooterAction,
            },
          }}
        />
        <p className={styles.hint}>
          登録すると、会場ですれちがった人と<br />
          匿名でつながれます
        </p>
      </div>
    </main>
  );
}
