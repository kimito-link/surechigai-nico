"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function SignInSsoCallbackPage() {
  return (
    <main className={styles.main}>
      <div className={styles.text}>
        ログイン処理中です。しばらくお待ちください...
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
