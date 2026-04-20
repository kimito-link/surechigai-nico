"use client";

import { useState } from "react";
import styles from "../onboarding.module.css";

interface ProfileStepProps {
  initialData: {
    nickname: string;
    ageGroup: string;
    gender: string;
    hitokoto: string;
  };
  onComplete: (data: {
    nickname: string;
    ageGroup: string;
    gender: string;
    hitokoto: string;
  }) => void;
}

const AGE_GROUPS = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s_plus", label: "50代以上" },
];

const GENDERS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
];

export default function ProfileStep({ initialData, onComplete }: ProfileStepProps) {
  const [nickname, setNickname] = useState(initialData.nickname);
  const [ageGroup, setAgeGroup] = useState(initialData.ageGroup);
  const [gender, setGender] = useState(initialData.gender);
  const [hitokoto, setHitokoto] = useState(initialData.hitokoto);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      alert("ニックネームを入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // プロフィール情報を保存（API呼び出し）
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${localStorage.getItem("uuid_token")}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          age_group: ageGroup,
          gender,
          hitokoto: hitokoto.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      onComplete({
        nickname: nickname.trim(),
        ageGroup,
        gender,
        hitokoto: hitokoto.trim(),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("プロフィールの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.stepCard}>
      <h2 className={styles.stepTitle}>プロフィール</h2>

      <div className={styles.formGroup}>
        <label htmlFor="nickname" className={styles.label}>
          ニックネーム <span className={styles.required}>*</span>
        </label>
        <input
          id="nickname"
          type="text"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例：りんくん"
          className={styles.input}
          disabled={isSubmitting}
        />
        <p className={styles.helperText}>{nickname.length} / 20 文字</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="ageGroup" className={styles.label}>
          年代
        </label>
        <select
          id="ageGroup"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          className={styles.select}
          disabled={isSubmitting}
        >
          <option value="unset">選択しない</option>
          {AGE_GROUPS.map((ag) => (
            <option key={ag.value} value={ag.value}>
              {ag.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="gender" className={styles.label}>
          性別
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={styles.select}
          disabled={isSubmitting}
        >
          <option value="unset">選択しない</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="hitokoto" className={styles.label}>
          ひとこと（今の気分）
        </label>
        <textarea
          id="hitokoto"
          maxLength={100}
          value={hitokoto}
          onChange={(e) => setHitokoto(e.target.value)}
          placeholder="例：楽しい気分です"
          className={styles.textarea}
          disabled={isSubmitting}
          rows={3}
        />
        <p className={styles.helperText}>{hitokoto.length} / 100 文字</p>
      </div>

      <button
        type="submit"
        className={styles.button}
        disabled={isSubmitting || !nickname.trim()}
      >
        {isSubmitting ? "保存中..." : "次へ"}
      </button>
    </form>
  );
}
