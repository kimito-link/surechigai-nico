"use client";

import { useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import styles from "../app.module.css";

export default function LocationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLocationSubmit = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          { timeout: 10000 }
        );
      });

      const uuid = getUuidToken();
      if (!uuid) {
        throw new Error("認証トークンが見つかりません");
      }

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          lat: position.latitude,
          lng: position.longitude,
        }),
      });

      if (!res.ok) {
        throw new Error("位置情報の送信に失敗しました");
      }

      setMessage({ type: "success", text: "位置情報を送信しました" });
    } catch (error) {
      const errorMsg =
        error instanceof GeolocationPositionError
          ? "位置情報の許可が必要です"
          : error instanceof Error
            ? error.message
            : "位置情報送信エラー";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>位置情報</h3>
      <p className={styles.cardDescription}>
        会場内での正確なマッチングのために位置情報を送信してください
      </p>
      <button
        onClick={handleLocationSubmit}
        disabled={isLoading}
        className={styles.button}
      >
        {isLoading ? "送信中..." : "位置情報を送信"}
      </button>
      {message && (
        <p className={message.type === "success" ? styles.successMessage : styles.errorMessage}>
          {message.text}
        </p>
      )}
    </div>
  );
}
