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

  /**
   * プロフィール保存と次ステップへの遷移を共通化。
   * - ワンタップ（Xのまま使う）: 現在の state そのまま（ほぼ初期値）で PATCH
   * - 詳細フォーム: ユーザーが編集した state で PATCH
   * どちらも「ニックネームが空でない」だけを必須バリデーションとする。
   */
  const submitProfile = async (opts?: { silent?: boolean }) => {
    if (!nickname.trim()) {
      if (!opts?.silent) alert("ニックネームを入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitProfile();
  };

  const handleQuickSubmit = async () => {
    // X からの自動補完値のまま即確定する導線。
    // ニックネーム空のとき（X 情報が取れていない稀なケース）は alert ではなく
    // 静かにスキップして、ユーザーを下のフォームに誘導する。
    await submitProfile({ silent: true });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.stepCard}>
      <h2 className={styles.stepTitle}>プロフィール</h2>

      {/*
        ワンタップ導線: X ログイン済みで nickname が自動補完されていれば、
        年代・性別・ひとこと などの任意項目を埋めずに即 Location ステップへ進める。
        超会議会場での離脱率対策（入力フォームで脱落させない）。
      */}
      {nickname.trim().length > 0 && (
        <div className={styles.quickCta}>
          <p className={styles.quickCtaTitle}>
            Xの情報でそのまま使えます
          </p>
          <p className={styles.quickCtaText}>
            ニックネームは <strong>「{nickname}」</strong> で登録します。
            年代・性別・ひとことは <strong>あとでプロフィールから変更できます</strong>。
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.quickCtaButton}`}
            onClick={() => void handleQuickSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : "Xのままで使う（ワンタップ）"}
          </button>
        </div>
      )}

      <p className={styles.detailsDivider}>
        <span>詳しく設定する（任意）</span>
      </p>

      <fieldset className={styles.formSection}>
        <legend className={styles.formSectionTitle}>基本（最大3項目）</legend>
        <p className={styles.formSectionHint}>
          ニックネーム・年代・性別はこのブロックにまとめています（入力負荷を分散）。
        </p>

      <div className={styles.formGroup}>
        <label htmlFor="nickname" className={styles.label}>
          ニックネーム <span className={styles.required}>*</span>
        </label>
        <input
          id="nickname"
          type="text"
          name="nickname"
          autoComplete="nickname"
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
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend className={styles.formSectionTitle}>ひとこと</legend>
        <p className={styles.formSectionHint}>任意。短い一言なら未入力のままでも次へ進めます。</p>

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
      </fieldset>

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
