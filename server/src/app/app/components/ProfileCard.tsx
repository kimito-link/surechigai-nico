"use client";

import { useUser } from "@clerk/nextjs";
import styles from "../app.module.css";

export default function ProfileCard() {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <div className={styles.card}>
        <p>読み込み中...</p>
      </div>
    );
  }

  const rawAvatar = user?.imageUrl || "/default-avatar.png";
  // Clerk CDN → サイズパラメータ付与、Twitter直URL → _normalを除去
  const avatar = rawAvatar.includes("img.clerk.com")
    ? `${rawAvatar}${rawAvatar.includes("?") ? "&" : "?"}width=200&height=200`
    : rawAvatar.replace(/_normal\./, ".");
  const displayName = user?.fullName || user?.firstName || "匿名さん";
  // X専用ログインなので最初のexternalAccountがTwitter
  const xAccount = user?.externalAccounts?.[0];
  const twitterHandle = xAccount?.username ? `@${xAccount.username}` : "";
  const twitterId = (xAccount as any)?.externalId || "";

  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        <img src={avatar} alt={displayName} className={styles.avatar} />
        <div className={styles.userInfo}>
          <h2 className={styles.nickname}>{displayName}</h2>
          {twitterHandle && <p className={styles.twitterHandle}>{twitterHandle}</p>}
          {twitterId && <p className={styles.twitterId}>ID: {twitterId}</p>}
        </div>
      </div>
    </div>
  );
}
