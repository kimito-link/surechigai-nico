"use client";

import { useState } from "react";
import styles from "../onboarding.module.css";

interface LocationStepProps {
  uuid: string;
  onComplete: () => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function LocationStep({
  uuid,
  onComplete,
  onError,
  onBack,
}: LocationStepProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  const handleRequestLocation = async () => {
    setIsLocating(true);

    try {
      // Geolocation API で位置情報を取得
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      const { latitude, longitude } = position.coords;

      // /api/locations に送信
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save location");
      }

      onComplete();
    } catch (error) {
      console.error("Location error:", error);
      let message = "位置情報の取得に失敗しました";

      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          message = "位置情報の権限がありません";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "位置情報が利用できません";
        } else if (error.code === error.TIMEOUT) {
          message = "位置情報の取得がタイムアウトしました";
        }
      }

      onError(message);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSkip = () => {
    setIsSkipped(true);
    onComplete();
  };

  return (
    <div className={styles.stepCard}>
      <h2 className={styles.stepTitle}>位置情報を許可</h2>

      <div className={styles.locationContent}>
        <div className={styles.icon}>📍</div>

        <p className={styles.description}>
          会場内であなたの近くにいる人とすれちがいやすくなります。
        </p>

        <p className={styles.note}>
          位置情報は会場内のマッチングにのみ使用され、プライバシーは保護されます。
        </p>

        {isSkipped && (
          <div className={styles.alert}>
            位置情報の許可をスキップしました。後からプロフィール設定で許可できます。
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onBack}
          className={`${styles.button} ${styles.buttonSecondary}`}
          disabled={isLocating}
        >
          戻る
        </button>

        <button
          type="button"
          onClick={handleRequestLocation}
          className={styles.button}
          disabled={isLocating || isSkipped}
        >
          {isLocating ? "取得中..." : "位置情報を許可"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className={styles.skipButton}
        disabled={isLocating || isSkipped}
      >
        スキップ
      </button>
    </div>
  );
}
