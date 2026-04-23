"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PREFECTURE_NAMES,
  prefectureCodeToName,
} from "@/lib/prefectureCodes";
import { getUuidToken } from "@/lib/clientAuth";
import styles from "../app.module.css";

/**
 * CODEX-NEXT.md §1 の既存ユーザー向け導線。
 * オンボーディング後にアプリに戻ってきた人が、後から
 *   - 参加県（home_prefecture）
 *   - 公開範囲（location_visibility）
 * を変更できるカード。/app のホームに置く。
 *
 * GET /api/users/me で現在値を読み取り、PATCH /api/users/me で保存。
 * 認証は localStorage の uuid_token を Bearer ヘッダに載せる（既存パターン）。
 */

const PREFECTURE_OPTIONS = PREFECTURE_NAMES.map((name, i) => ({
  code: String(i + 1).padStart(2, "0"),
  name,
}));

const VISIBILITY_OPTIONS: Array<{
  value: 0 | 1 | 2;
  label: string;
  hint: string;
}> = [
  {
    value: 0,
    label: "公開しない（デフォルト）",
    hint: "誰にも参加県は見せません",
  },
  {
    value: 1,
    label: "すれちがった人にだけ見せる",
    hint: "マッチ画面のバッジに表示されます",
  },
  {
    value: 2,
    label: "全体に公開する",
    hint: "ゆっくり解説や地図ピンで会場に表示されます",
  },
];

type Props = {
  authUuid?: string | null;
  /** register-direct 完了前は叩かない（古い UUID による 401 防止） */
  ready?: boolean;
};

export default function PrefectureSettingsCard({ authUuid, ready = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [homePrefecture, setHomePrefecture] = useState<string | null>(null);
  const [locationVisibility, setLocationVisibility] = useState<0 | 1 | 2>(0);
  // 編集中の下書き。キャンセル時にこの値を捨てる。
  const [draftPref, setDraftPref] = useState<string | null>(null);
  const [draftVis, setDraftVis] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const uuid = authUuid ?? (typeof window !== "undefined" ? getUuidToken() : null);
    if (!uuid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include",
          headers: { Authorization: `Bearer uuid:${uuid}` },
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.user) {
          const pref =
            typeof data.user.home_prefecture === "string"
              ? data.user.home_prefecture
              : null;
          const v = data.user.location_visibility;
          const nv: 0 | 1 | 2 = v === 1 ? 1 : v === 2 ? 2 : 0;
          setHomePrefecture(pref);
          setLocationVisibility(nv);
          setDraftPref(pref);
          setDraftVis(nv);
        }
      } catch {
        // 初期値取得失敗は致命ではない。未設定扱いで続行。
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUuid, ready]);

  const currentPrefName = useMemo(
    () => prefectureCodeToName(homePrefecture),
    [homePrefecture]
  );
  const currentVisLabel = useMemo(
    () =>
      VISIBILITY_OPTIONS.find((o) => o.value === locationVisibility)?.label ??
      "公開しない",
    [locationVisibility]
  );

  const startEdit = () => {
    setDraftPref(homePrefecture);
    setDraftVis(locationVisibility);
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const uuid = authUuid ?? (typeof window !== "undefined" ? getUuidToken() : null);
    if (!uuid) {
      setError("認証情報が取得できません。再読み込みしてください。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          home_prefecture: draftPref,
          location_visibility: draftVis,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof data?.error === "string" ? data.error : `保存に失敗しました (${res.status})`;
        throw new Error(msg);
      }
      setHomePrefecture(draftPref);
      setLocationVisibility(draftVis);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    // 初期ロード中はカードごと出さない（UI のちらつき防止）。
    return null;
  }

  return (
    <section className={styles.card} aria-label="参加県と公開範囲">
      <h3 className={styles.cardTitle}>参加県（任意・デフォルト非公開）</h3>
      <p className={styles.cardDescription}>
        超会議で「〇〇から来たんです」のきっかけに使えます。公開範囲は自分で選べます。
      </p>

      {!editing ? (
        <div className={styles.prefSummaryRow}>
          <div className={styles.prefSummaryText}>
            <span className={styles.prefSummaryPref}>
              {currentPrefName ?? "未設定"}
            </span>
            <span className={styles.prefSummaryVis}>
              公開範囲: {currentVisLabel}
            </span>
          </div>
          <button
            type="button"
            className={styles.prefEditButton}
            onClick={startEdit}
          >
            変更する
          </button>
        </div>
      ) : (
        <div className={styles.prefEditor}>
          <div className={styles.prefFormGroup}>
            <label htmlFor="prefCardHome" className={styles.prefLabel}>
              参加県
            </label>
            <select
              id="prefCardHome"
              value={draftPref ?? ""}
              onChange={(e) => setDraftPref(e.target.value ? e.target.value : null)}
              className={styles.prefSelect}
              disabled={saving}
            >
              <option value="">選択しない</option>
              {PREFECTURE_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.prefFormGroup}>
            <label htmlFor="prefCardVis" className={styles.prefLabel}>
              公開範囲
            </label>
            <select
              id="prefCardVis"
              value={String(draftVis)}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraftVis(n === 1 ? 1 : n === 2 ? 2 : 0);
              }}
              className={styles.prefSelect}
              disabled={saving}
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className={styles.prefHint}>
              {VISIBILITY_OPTIONS.find((o) => o.value === draftVis)?.hint}
            </p>
          </div>

          {error && (
            <p className={styles.prefError} role="alert">
              {error}
            </p>
          )}

          <div className={styles.prefButtonRow}>
            <button
              type="button"
              className={styles.prefSaveButton}
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            <button
              type="button"
              className={styles.prefCancelButton}
              onClick={cancelEdit}
              disabled={saving}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
