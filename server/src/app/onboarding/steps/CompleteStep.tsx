"use client";

import styles from "../onboarding.module.css";

interface CompleteStepProps {
  nickname: string;
  onComplete: () => void;
}

export default function CompleteStep({ nickname, onComplete }: CompleteStepProps) {
  return (
    <div className={styles.stepCard}>
      <div className={styles.completeContent}>
        <div className={styles.icon}>🎉</div>

        <h2 className={styles.completeTitle}>プロフィール設定完了</h2>

        <p className={styles.completeMessage}>
          こんにちは、<strong>{nickname}</strong> さん！
        </p>

        <p className={styles.completeDescription}>
          これであなたのプロフィールが準備できました。
          <br />
          さあ、会場内ですれちがった人たちと交流しましょう！
        </p>
      </div>

      <button type="button" onClick={onComplete} className={styles.button}>
        ホームへ進む
      </button>
    </div>
  );
}
