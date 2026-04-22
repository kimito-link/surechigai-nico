import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Expo dev serverのhostからLAN IPを自動取得
function getDevHost(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    if (host && host !== "127.0.0.1") return host;
  }
  return Platform.select({
    android: "10.0.2.2",
    default: "localhost",
  }) as string;
}

export const DEV_HOST = getDevHost();
export const SERVER_BASE = __DEV__
  ? `http://${DEV_HOST}:3002`
  : "https://surechigai-nico.link";

const API_BASE = `${SERVER_BASE}/api`;

async function getUuid(): Promise<string | null> {
  return await SecureStore.getItemAsync("uuid");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const uuid = await getUuid();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (uuid) {
    headers["Authorization"] = `Bearer uuid:${uuid}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "不明なエラー" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// 認証
export async function registerUser(uuid: string) {
  return request<{
    user: { id: number; uuid: string; nickname: string };
    isNew: boolean;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ uuid }),
  });
}

// プロフィール
export async function getProfile() {
  return request<{ user: Record<string, unknown> }>("/users/me");
}

export async function updateProfile(data: Record<string, unknown>) {
  return request<{ ok: boolean }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount() {
  return request<{ ok: boolean; message: string }>("/users/me", {
    method: "DELETE",
  });
}

// 位置情報
export async function sendLocation(lat: number, lng: number) {
  return request<{ ok: boolean }>("/locations", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
}

// すれちがい
export async function getEncounters(page = 1, limit = 20) {
  return request<{
    encounters: EncounterItem[];
    page: number;
    limit: number;
  }>(`/encounters?page=${page}&limit=${limit}`);
}

export async function likeEncounter(encounterId: number, reactionType = "like") {
  return request<{ ok: boolean; reaction_type: string }>(`/encounters/${encounterId}/like`, {
    method: "POST",
    body: JSON.stringify({ reaction_type: reactionType }),
  });
}

export async function unlikeEncounter(encounterId: number) {
  return request<{ ok: boolean }>(`/encounters/${encounterId}/like`, {
    method: "DELETE",
  });
}

// Spotify
export async function searchSpotifyTracks(query: string) {
  return request<{
    tracks: SpotifyTrackResult[];
  }>(`/spotify/search?q=${encodeURIComponent(query)}`);
}

// ブロック
export async function blockUser(userId: number) {
  return request<{ ok: boolean }>("/blocks", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function unblockUser(userId: number) {
  return request<{ ok: boolean }>("/blocks", {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
}

// 通報
export async function reportUser(data: {
  reportedUserId: number;
  encounterId?: number;
  reason: string;
  detail?: string;
}) {
  return request<{ ok: boolean }>("/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 行動ログ
export async function sendActivity(eventType: string) {
  return request<{ ok: boolean }>("/activity", {
    method: "POST",
    body: JSON.stringify({ event_type: eventType }),
  });
}

// エリア統計
export async function getAreaActiveCount(lat: number, lng: number) {
  return request<{ active_count: number }>(`/stats/area?lat=${lat}&lng=${lng}`);
}

// 分身
export async function getGhost() {
  return request<{ ghost: { prefecture: string; municipality: string; area_name: string; placed_at: string; hitokoto: string | null } | null; canPlaceAfter: string | null; activePrefectures: string[] | null }>("/ghost");
}

export async function placeGhost(prefecture: string, ghostHitokoto?: string) {
  return request<{ ok: boolean; ghost: { prefecture: string; municipality: string; area_name: string; hitokoto: string | null } }>("/ghost", {
    method: "POST",
    body: JSON.stringify({ prefecture, ghost_hitokoto: ghostHitokoto || undefined }),
  });
}

export async function removeGhost(expired = false) {
  return request<{ ok: boolean }>(`/ghost${expired ? "?expired=1" : ""}`, { method: "DELETE" });
}

// 今日のお題
export async function getTodayTopic() {
  return request<{ topic: string | null }>("/topics/today");
}

// 統計
export async function getMyStats() {
  return request<{
    totalEncounters: number;
    streakCount: number;
    hourCounts: number[];
    topAreas: { area: string; count: number }[];
  }>("/stats/me");
}

// 都道府県マップ
export async function getPrefectures() {
  return request<{
    prefectures: { prefecture: string; first_encountered_at: string; encounter_count: number }[];
    total: number;
  }>("/prefectures");
}

// バッジ
export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "milestone" | "rare" | "seasonal";
  earned_at: string | null;
}

export async function getUserBadges(userId: number) {
  return request<{
    badges: { id: string; name: string; icon: string; category: string }[];
  }>(`/users/${userId}/badges`);
}

export async function getBadges() {
  return request<{
    badges: BadgeItem[];
    stats: { totalEncounters: number; prefectureCount: number };
  }>("/badges");
}

// デバッグ
export async function seedTestData(far = false) {
  return request<{ ok: boolean; message: string }>(`/debug/seed${far ? "?far=1" : ""}`, {
    method: "POST",
  });
}

export async function scatterTestUsers(count = 10) {
  return request<{ ok: boolean; message: string; summary: string; users: { nickname: string; prefecture: string; municipality: string }[] }>(`/debug/scatter?count=${count}`, {
    method: "POST",
  });
}

export async function runDebugMatcher() {
  return request<{ ok: boolean; message: string; zeroEncounterUsers: number; results: { tier: number; label: string; matches: string[] }[]; notifications: string[] }>("/debug/matcher", {
    method: "POST",
  });
}

// 型定義
export interface EncounterItem {
  id: number;
  encountered_at: string;
  lat_grid: number;
  lng_grid: number;
  area_name: string | null;
  tier: number;
  other_user_id: number;
  other_nickname: string;
  other_avatar_config: Record<string, unknown> | null;
  other_avatar_url: string | null;
  other_hitokoto: string | null;
  other_spotify_track_name: string | null;
  other_spotify_artist_name: string | null;
  other_spotify_album_image_url: string | null;
  other_spotify_track_id: string | null;
  other_age_group: string | null;
  other_gender: string | null;
  my_like: number;
  my_reaction_type: string | null;
  other_like: number;
  other_reaction_type: string | null;
  is_my_ghost: boolean;
  other_encounter_count: number;
}

export interface SpotifyTrackResult {
  id: string;
  name: string;
  artistName: string;
  albumImageUrl: string;
  spotifyUrl: string;
}
