import React, { useEffect, useRef, useState, useCallback } from "react";
import * as Location from "expo-location";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  AppState,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useEncounters } from "@/hooks/useEncounters";
import { useLocationContext } from "./_layout";
import { LocationPermissionBanner } from "@/components/LocationPermissionBanner";
import { Avatar } from "@/components/Avatar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as StoreReview from "expo-store-review";
import * as SecureStore from "expo-secure-store";
import { useAppStore } from "@/store";
import { getProfile, getAreaActiveCount, sendActivity, updateProfile, getTodayTopic } from "@/lib/api";
import type { EncounterItem } from "@/lib/api";

const REVIEW_MILESTONES = [5, 15, 50];

async function maybeRequestReview(encounterCount: number) {
  try {
    const asked = await SecureStore.getItemAsync("review_asked_at");
    if (asked) {
      const diff = Date.now() - Number(asked);
      if (diff < 30 * 24 * 60 * 60 * 1000) return;
    }
    const lastMilestone = await SecureStore.getItemAsync("review_last_milestone");
    const milestone = REVIEW_MILESTONES.find(
      (m) => encounterCount >= m && String(m) !== lastMilestone
    );
    if (!milestone) return;
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await StoreReview.requestReview();
    await SecureStore.setItemAsync("review_asked_at", String(Date.now()));
    await SecureStore.setItemAsync("review_last_milestone", String(milestone));
  } catch {}
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const minutes = Math.floor(d.getMinutes() / 10) * 10;
  return `${d.getHours()}:${String(minutes).padStart(2, "0")}ごろ`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  const diffHour = Math.floor(diffMs / (60 * 60 * 1000));

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return "昨日";
}

const TIER_LABELS: Record<number, string> = {
  1: "すれちがい",
  2: "ご近所さん",
  3: "同じ街",
  4: "同じ地域",
  5: "おさんぽ",
};

const TIER_COLORS: Record<number, string> = {
  1: "#E8734A",
  2: "#4A90D9",
  3: "#7B68EE",
  4: "#999",
  5: "#50C878",
};

function EncounterCard({ item, onPress }: { item: EncounterItem; onPress: () => void }) {
  const tier = item.tier || 1;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Avatar
          url={item.other_avatar_url}
          nickname={item.other_nickname}
          size={44}
        />
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.nickname}>{item.other_nickname}</Text>
            {tier === 5 ? (
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[5] }]}>
                <Text style={styles.tierBadgeText}>おさんぽ</Text>
              </View>
            ) : tier > 1 ? (
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] }]}>
                <Text style={styles.tierBadgeText}>{TIER_LABELS[tier]}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.areaTime}>
            {item.area_name || "不明なエリア"} ・ {formatTime(item.encountered_at)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.dateText}>{formatDate(item.encountered_at)}</Text>
          {Number(item.other_like) > 0 && (() => {
            const iconMap: Record<string, { name: "heart" | "handshake" | "emoticon-happy" | "music-note"; color: string; label: string }> = {
              like: { name: "heart", color: "#FF6B6B", label: "いいね" },
              wakaru: { name: "handshake", color: "#4A90D9", label: "わかる" },
              ukeru: { name: "emoticon-happy", color: "#FFB347", label: "ウケる" },
              iine_song: { name: "music-note", color: "#1DB954", label: "いい曲" },
            };
            const r = iconMap[item.other_reaction_type || "like"] || iconMap.like;
            return (
              <View style={[styles.reactionBadge, { backgroundColor: r.color + "15", borderColor: r.color + "30" }]}>
                <Avatar url={item.other_avatar_url} nickname={item.other_nickname} size={18} />
                <MaterialCommunityIcons name={r.name} size={14} color={r.color} />
                <Text style={[styles.reactionBadgeText, { color: r.color }]}>{r.label}</Text>
              </View>
            );
          })()}
        </View>
      </View>

      {item.other_hitokoto && (
        <Text style={styles.hitokoto}>「{item.other_hitokoto}」</Text>
      )}

      {item.other_spotify_track_name && (
        <View style={styles.musicRow}>
          <Text style={styles.musicIcon}>♪</Text>
          <Text style={styles.musicText} numberOfLines={1}>
            {item.other_spotify_track_name} - {item.other_spotify_artist_name}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { permissionStatus, openSettings } = useLocationContext();
  const { encounters, refresh, loadMore, refreshing, isLoading } = useEncounters();
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const nickname = useAppStore((s) => s.nickname);
  const hitokoto = useAppStore((s) => s.hitokoto);
  const streakCount = useAppStore((s) => s.streakCount);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [areaActiveCount, setAreaActiveCount] = useState<number | null>(null);
  const [todayTopic, setTodayTopic] = useState<string | null>(null);
  const [editingHitokoto, setEditingHitokoto] = useState(false);
  const [tempHitokoto, setTempHitokoto] = useState("");
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);

  // 初回読み込み + プロフィール取得 + 行動ログ + 現在地を監視
  useEffect(() => {
    refresh();
    sendActivity("app_open").catch(() => {});
    getTodayTopic().then((r) => setTodayTopic(r.topic)).catch(() => {});
    getProfile().then(({ user }) => {
      useAppStore.getState().setProfile({
        nickname: user.nickname as string,
        hitokoto: (user.hitokoto as string) || "",
        avatarUrl: user.avatar_url as string | null,
        avatarConfig: (user.avatar_config as Record<string, unknown>) || null,
        spotifyTrackName: user.spotify_track_name as string | null,
        spotifyArtistName: user.spotify_artist_name as string | null,
        streakCount: (user.streak_count as number) || 0,
      });
      setTempHitokoto((user.hitokoto as string) || "");
    }).catch(() => {});
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;

        // まず最後の既知位置を取得(フォールバック)
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          setUserLocation({ lat: last.coords.latitude, lng: last.coords.longitude });
          getAreaActiveCount(last.coords.latitude, last.coords.longitude)
            .then((r) => setAreaActiveCount(r.active_count))
            .catch(() => {});
        }

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Low, distanceInterval: 100 },
          (loc) => {
            setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          }
        );
      } catch (e) {
        console.log("現在地監視エラー:", e);
      }
    })();
    return () => { sub?.remove(); };
  }, []);

  // フォアグラウンドに戻った時に自動更新
  const lastRefresh = useRef(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // 最低30秒間隔で更新（連続呼び出し防止）
        const now = Date.now();
        if (now - lastRefresh.current > 30000) {
          lastRefresh.current = now;
          refresh();
        }
      }
    });
    return () => sub.remove();
  }, [refresh]);

  // すれ違い累計でレビュー依頼(マウント時 + encounters変化時)
  const reviewChecked = useRef(false);
  useEffect(() => {
    if (encounters.length > 0 && !reviewChecked.current) {
      reviewChecked.current = true;
      // 少し遅延させてホーム画面が表示されてから出す
      setTimeout(() => maybeRequestReview(encounters.length), 2000);
    }
  }, [encounters.length]);

  const handleZoom = useCallback((zoomIn: boolean) => {
    const r = currentRegionRef.current || mapRegion;
    const factor = zoomIn ? 0.5 : 2;
    const newRegion = {
      latitude: r.latitude,
      longitude: r.longitude,
      latitudeDelta: r.latitudeDelta * factor,
      longitudeDelta: r.longitudeDelta * factor,
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion, 200);
  }, []);

  const handleSaveHitokoto = async () => {
    try {
      await updateProfile({ hitokoto: tempHitokoto || null });
      useAppStore.getState().setProfile({ hitokoto: tempHitokoto });
      setEditingHitokoto(false);
    } catch {}
  };

  const now = Date.now();
  const todayEncounters = encounters.filter((e) => {
    // 自分のおさんぽbotが出会った人はホームに表示しない(おさんぽタブで表示)
    if (e.is_my_ghost) return false;
    return now - new Date(e.encountered_at).getTime() < 24 * 60 * 60 * 1000;
  });

  // マップの表示範囲を計算(近距離のすれちがいに絞る)
  const nearEncounters = todayEncounters.filter((e) => (e.tier || 1) <= 3);
  const mapPoints = [
    ...(nearEncounters.length > 0 ? nearEncounters : todayEncounters)
      .map((e) => ({ lat: Number(e.lat_grid), lng: Number(e.lng_grid) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0),
    ...(userLocation ? [userLocation] : []),
  ];

  const defaultRegion = {
    latitude: userLocation?.lat ?? 35.6812,
    longitude: userLocation?.lng ?? 139.7671,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const mapRegion = mapPoints.length > 1
    ? (() => {
        const lats = mapPoints.map((p) => p.lat);
        const lngs = mapPoints.map((p) => p.lng);
        const latSpan = Math.max(...lats) - Math.min(...lats);
        const lngSpan = Math.max(...lngs) - Math.min(...lngs);
        return {
          latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
          longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
          latitudeDelta: Math.max(0.005, Math.min(0.3, latSpan * 1.3 + 0.003)),
          longitudeDelta: Math.max(0.005, Math.min(0.3, lngSpan * 1.3 + 0.003)),
        };
      })()
    : {
        latitude: mapPoints[0]?.lat ?? defaultRegion.latitude,
        longitude: mapPoints[0]?.lng ?? defaultRegion.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  const listHeader = (
    <>
      <Pressable
        style={styles.venueMapBanner}
        onPress={() => router.push("/venue-map")}
        accessibilityRole="button"
        accessibilityLabel="会場マップを開く"
      >
        <MaterialCommunityIcons name="map-search-outline" size={26} color="#E8734A" />
        <View style={styles.venueMapBannerText}>
          <Text style={styles.venueMapBannerTitle}>会場マップ（PDF）</Text>
          <Text style={styles.venueMapBannerSub}>ニコニコ超会議のフロアを確認</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
      </Pressable>

      {/* マップ */}
      {(todayEncounters.length > 0 || userLocation) && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation={true}
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={false}
            pitchEnabled={false}
            onRegionChangeComplete={(r) => { currentRegionRef.current = r; }}
          >
            {todayEncounters.filter((e) => e.tier !== 5).map((e, idx) => {
              if (!e.lat_grid || !e.lng_grid) return null;
              // 同じ座標のマーカーをずらす
              const sameCoordIdx = todayEncounters
                .slice(0, idx)
                .filter((o) => o.lat_grid === e.lat_grid && o.lng_grid === e.lng_grid).length;
              const offset = sameCoordIdx * 0.0008;
              return (
                <Marker
                  key={e.id}
                  coordinate={{
                    latitude: Number(e.lat_grid) + offset,
                    longitude: Number(e.lng_grid) + offset,
                  }}
                  title={e.other_nickname}
                >
                  <View style={[styles.mapMarker, { backgroundColor: TIER_COLORS[e.tier || 1] }]}>
                    <Text style={styles.mapMarkerText}>
                      {e.other_nickname?.charAt(0) || "?"}
                    </Text>
                  </View>
                </Marker>
              );
            })}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
                }}
                title="自分の位置"
                zIndex={999}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.myLocationMarker}>
                  <Avatar url={avatarUrl} nickname={nickname} size={40} />
                </View>
              </Marker>
            )}
          </MapView>
          <View style={styles.zoomButtons}>
            <Pressable style={styles.zoomButton} onPress={() => handleZoom(true)}>
              <MaterialCommunityIcons name="plus" size={20} color="#333" />
            </Pressable>
            <View style={styles.zoomSeparator} />
            <Pressable style={styles.zoomButton} onPress={() => handleZoom(false)}>
              <MaterialCommunityIcons name="minus" size={20} color="#333" />
            </Pressable>
          </View>
        </View>
      )}

      {/* ひとこと */}
      <View style={styles.hitokotoSection}>
        {editingHitokoto ? (
          <View>
            {todayTopic && (
              <Text style={styles.topicHint}>今日のお題: {todayTopic}</Text>
            )}
            <View style={styles.hitokotoEditRow}>
              <TextInput
                style={styles.hitokotoInput}
                value={tempHitokoto}
                onChangeText={setTempHitokoto}
                maxLength={100}
                placeholder={todayTopic || "今の気分をひとことで"}
                placeholderTextColor="#BBB"
                autoFocus
              />
              <Pressable style={styles.hitokotoSaveBtn} onPress={handleSaveHitokoto}>
                <Text style={styles.hitokotoSaveBtnText}>保存</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.hitokotoDisplay}
            onPress={() => { setTempHitokoto(hitokoto || ""); setEditingHitokoto(true); }}
          >
            <View style={styles.hitokotoLeft}>
              <MaterialCommunityIcons name="message-text-outline" size={18} color={hitokoto ? "#E8734A" : "#BBB"} />
              {hitokoto ? (
                <View style={{ flex: 1 }}>
                  {todayTopic && (
                    <Text style={styles.topicLabel}>今日のお題: {todayTopic}</Text>
                  )}
                  <Text style={styles.hitokotoText}>{hitokoto}</Text>
                </View>
              ) : todayTopic ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.topicLabel}>お題: {todayTopic}</Text>
                  <Text style={styles.hitokotoPlaceholder}>自由にひとことを書こう</Text>
                </View>
              ) : (
                <Text style={styles.hitokotoPlaceholder}>ひとことを書く</Text>
              )}
            </View>
            <View style={styles.hitokotoEditBadge}>
              <Text style={styles.hitokotoEditBadgeText}>{hitokoto ? "編集" : "書く"}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>今日のすれちがい</Text>
          {streakCount >= 2 && (
            <Text style={styles.streakText}>{streakCount}日連続すれちがい中!</Text>
          )}
        </View>
        <Text style={styles.headerCount}>{todayEncounters.length}人</Text>
      </View>

      {(() => {
        const reacted = todayEncounters.filter((e) => Number(e.other_like) > 0);
        if (reacted.length === 0) return null;
        return (
          <Pressable
            style={styles.reactionSummary}
            onPress={() => {
              if (reacted.length >= 6) {
                router.push("/reactions");
              } else {
                const first = reacted[0];
                if (first) router.push(`/encounter/${first.id}`);
              }
            }}
          >
            <View style={styles.reactionAvatars}>
              {reacted.slice(0, 5).map((e) => (
                <View key={e.id} style={styles.reactionAvatarWrap}>
                  <Avatar url={e.other_avatar_url} nickname={e.other_nickname} size={24} />
                </View>
              ))}
              {reacted.length > 5 && (
                <View style={[styles.reactionAvatarWrap, styles.reactionAvatarMore]}>
                  <Text style={styles.reactionMoreText}>+{reacted.length - 5}</Text>
                </View>
              )}
            </View>
            <Text style={styles.reactionSummaryText}>
              {reacted.length}人からリアクションが届いています
            </Text>
          </Pressable>
        );
      })()}

      {todayEncounters.some((e) => (e.tier || 1) > 1) && (
        <View style={styles.tierInfo}>
          <Text style={styles.tierInfoText}>
            近くにすれちがいがない時は範囲を広げて検出します
          </Text>
        </View>
      )}

      <LocationPermissionBanner status={permissionStatus} onPress={openSettings} />
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={todayEncounters}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EncounterCard
            item={item}
            onPress={() => router.push(`/encounter/${item.id}`)}
          />
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            {encounters.length === 0 ? (
              <>
                <Text style={styles.emptyTitle}>位置情報を取得中...</Text>
                <Text style={styles.emptyText}>
                  最初のすれちがいをお待ちください{"\n"}
                  アプリを閉じていても自動で検出します
                </Text>
                {areaActiveCount !== null && areaActiveCount > 0 && (
                  <View style={styles.areaCountBadge}>
                    <Text style={styles.areaCountText}>
                      このエリアには今 {areaActiveCount}人 がアプリを使っています
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>
                  今日はまだすれちがいがありません{"\n"}街を歩いてみましょう!
                </Text>
                {areaActiveCount !== null && areaActiveCount > 0 && (
                  <View style={styles.areaCountBadge}>
                    <Text style={styles.areaCountText}>
                      このエリアには今 {areaActiveCount}人 がアプリを使っています
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF4E8",
  },
  venueMapBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFF",
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0E6DC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  venueMapBannerText: {
    flex: 1,
  },
  venueMapBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  venueMapBannerSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  mapContainer: {
    height: 260,
    backgroundColor: "#E8E8E8",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  zoomButtons: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  zoomButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomSeparator: {
    height: 1,
    backgroundColor: "#EEE",
  },
  mapMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8734A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mapMarkerText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  myLocationMarker: {
    borderWidth: 3,
    borderColor: "#FF3B30",
    borderRadius: 23,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hitokotoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF9F2",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  hitokotoDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  hitokotoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  hitokotoText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
  },
  hitokotoPlaceholder: {
    fontSize: 13,
    color: "#BBB",
  },
  hitokotoEditBadge: {
    backgroundColor: "#E8734A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  hitokotoEditBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  hitokotoEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hitokotoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFF",
  },
  hitokotoSaveBtn: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hitokotoSaveBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  topicHint: {
    fontSize: 12,
    color: "#E8734A",
    marginBottom: 8,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E8734A",
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF9F2",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E8734A",
    marginTop: 2,
  },
  headerCount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E8734A",
  },
  tierInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#F0F7FF",
  },
  tierInfoText: {
    fontSize: 12,
    color: "#4A90D9",
    textAlign: "center",
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF9F2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8734A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  cardInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  areaTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFF0F0",
    gap: 10,
  },
  reactionAvatars: {
    flexDirection: "row",
  },
  reactionAvatarWrap: {
    marginLeft: -6,
    borderWidth: 2,
    borderColor: "#FFF0F0",
    borderRadius: 14,
  },
  reactionAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8734A",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionMoreText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  reactionSummaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B6B",
  },
  hitokoto: {
    fontSize: 15,
    color: "#555",
    marginTop: 12,
    lineHeight: 22,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  musicIcon: {
    fontSize: 14,
    color: "#1DB954",
    marginRight: 8,
  },
  musicText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 26,
  },
  areaCountBadge: {
    backgroundColor: "#E8734A",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 24,
  },
  areaCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "center",
  },
});
