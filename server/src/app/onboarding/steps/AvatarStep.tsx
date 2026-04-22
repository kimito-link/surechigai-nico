"use client";

import { useState } from "react";
import styles from "../onboarding.module.css";

interface AvatarStepProps {
  uuid: string;
  nickname: string;
  onComplete: (avatarConfig: Record<string, unknown>) => void;
  onBack: (() => void) | null;
  onSkip?: () => void;
}

interface AvatarOption {
  id: string;
  label: string;
  seed: string;
  image?: string;
}

const AVATAR_PRESETS: AvatarOption[] = [
  { id: "avataaars", label: "アバター 1", seed: "nickname" },
  { id: "bottts", label: "ロボット", seed: "nickname" },
  { id: "identicon", label: "アイコン", seed: "nickname" },
];

export default function AvatarStep({
  uuid,
  nickname,
  onComplete,
  onBack,
  onSkip,
}: AvatarStepProps) {
  const [selectedStyle, setSelectedStyle] = useState(AVATAR_PRESETS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // DiceBear APIでアバター画像を生成
      const avatarUrl = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(nickname)}&scale=80`;

      // SVG を取得
      const svgRes = await fetch(avatarUrl);
      const svgText = await svgRes.text();

      // アバター情報を保存
      const res = await fetch("/api/avatar/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          style: selectedStyle,
          format: "svg",
          svg: svgText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save avatar");
      }

      const data = await res.json();

      onComplete({
        style: selectedStyle,
        path: data.path,
      });
    } catch (error) {
      console.error("Error saving avatar:", error);
      alert("アバターの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.stepCard}>
      <h2 className={styles.stepTitle}>アバターを選択</h2>

      <div className={styles.avatarGrid}>
        {AVATAR_PRESETS.map((preset) => (
          <label key={preset.id} className={styles.avatarOption}>
            <input
              type="radio"
              name="avatar"
              value={preset.id}
              checked={selectedStyle === preset.id}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className={styles.radioInput}
            />
            <div className={styles.avatarPreview}>
              <img
                src={`https://api.dicebear.com/7.x/${preset.id}/svg?seed=${encodeURIComponent(nickname)}&scale=80`}
                alt={preset.label}
                width={80}
                height={80}
              />
            </div>
            <span className={styles.avatarLabel}>{preset.label}</span>
          </label>
        ))}
      </div>

      <p className={styles.helperText}>
        選択したスタイルであなたのアバターが生成されます
      </p>

      <div className={styles.buttonGroup}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={isSubmitting}
          >
            戻る
          </button>
        )}
        <button
          type="submit"
          className={styles.button}
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : "次へ"}
        </button>
      </div>

      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className={styles.skipButton}
          disabled={isSubmitting}
        >
          あとで設定（スキップ）
        </button>
      ) : null}
    </form>
  );
}
