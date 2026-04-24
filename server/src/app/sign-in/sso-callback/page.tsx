"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSsoCallbackPage() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          textAlign: "center",
          color: "#3a2f24",
          fontSize: "0.95rem",
        }}
      >
        ログイン処理中です。しばらくお待ちください...
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
