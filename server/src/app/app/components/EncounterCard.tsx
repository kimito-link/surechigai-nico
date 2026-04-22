"use client";

import Image from "next/image";
import { liveMapFormatAgo } from "@/lib/liveMapShared";
import styles from "../app.module.css";

export type EncounterRow = {
  id: number;
  encountered_at: string;
  area_name: string | null;
  tier: number;
  other_user_id: number;
  other_nickname: string;
  other_twitter_handle: string | null;
  other_avatar_url: string | null;
  other_hitokoto: string | null;
  other_spotify_track_name: string | null;
  other_spotify_artist_name: string | null;
  other_spotify_album_image_url: string | null;
  other_spotify_track_id: string | null;
  other_age_group: string | null;
  other_gender: string | null;
  other_encounter_count: number;
  is_my_ghost: 0 | 1 | boolean;
};

const TIER_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "すれ違い", className: "tierSurechigai" },
  2: { label: "ご近所", className: "tierGokinjo" },
  3: { label: "同じ街", className: "tierMachi" },
  4: { label: "同じ地域", className: "tierRegion" },
  5: { label: "おさんぽ", className: "tierSanpo" },
};

export default function EncounterCard({ encounter }: { encounter: EncounterRow }) {
  const tierInfo = TIER_LABELS[encounter.tier] ?? TIER_LABELS[1];
  const twitterUrl = encounter.other_twitter_handle
    ? `https://x.com/${encounter.other_twitter_handle.replace(/^@/, "")}`
    : null;
  const encounteredAtMs = new Date(encounter.encountered_at).getTime();

  return (
    <article className={styles.encounterCard}>
      <div className={styles.encounterCardHeader}>
        {encounter.other_avatar_url ? (
          <Image
            src={encounter.other_avatar_url}
            alt=""
            width={56}
            height={56}
            className={styles.encounterAvatar}
            unoptimized
          />
        ) : (
          <div className={styles.encounterAvatarFallback} aria-hidden="true">
            {encounter.other_nickname.charAt(0)}
          </div>
        )}

        <div className={styles.encounterIdentity}>
          <p className={styles.encounterNickname}>{encounter.other_nickname}</p>
          {twitterUrl ? (
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.encounterTwitter}
            >
              @{encounter.other_twitter_handle!.replace(/^@/, "")}
            </a>
          ) : (
            <span className={styles.encounterTwitterNone}>X 未連携</span>
          )}
        </div>

        <span className={`${styles.encounterTier} ${styles[tierInfo.className]}`}>
          {tierInfo.label}
        </span>
      </div>

      <div className={styles.encounterMeta}>
        <span className={styles.encounterArea}>
          📍 {encounter.area_name ?? "場所不明"}
        </span>
        <span className={styles.encounterTime}>
          {liveMapFormatAgo(encounteredAtMs)}
        </span>
      </div>

      {encounter.other_hitokoto && (
        <p className={styles.encounterHitokoto}>
          💬 {encounter.other_hitokoto}
        </p>
      )}

      {encounter.other_spotify_track_name && (
        <a
          href={
            encounter.other_spotify_track_id
              ? `https://open.spotify.com/track/${encounter.other_spotify_track_id}`
              : "#"
          }
          target="_blank"
          rel="noopener noreferrer"
          className={styles.encounterSpotify}
        >
          {encounter.other_spotify_album_image_url && (
            <Image
              src={encounter.other_spotify_album_image_url}
              alt=""
              width={36}
              height={36}
              className={styles.encounterSpotifyArt}
              unoptimized
            />
          )}
          <span className={styles.encounterSpotifyText}>
            <span className={styles.encounterSpotifyTrack}>
              🎵 {encounter.other_spotify_track_name}
            </span>
            {encounter.other_spotify_artist_name && (
              <span className={styles.encounterSpotifyArtist}>
                {encounter.other_spotify_artist_name}
              </span>
            )}
          </span>
        </a>
      )}

      <div className={styles.encounterFooter}>
        <span className={styles.encounterCount}>
          この人は通算 {encounter.other_encounter_count} 回すれちがい
        </span>
      </div>
    </article>
  );
}
