"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function SignUpSsoCallbackPage() {
  return (
    <main className={styles.main}>
      <div className={styles.text}>
        登録処理中です。しばらくお待ちください...
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
