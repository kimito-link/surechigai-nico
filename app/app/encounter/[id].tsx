import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  ScrollView,
  Dimensions,
} from "react-native";
import MapView, { Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "@/store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { likeEncounter, unlikeEncounter, blockUser, reportUser, getEncounters, sendActivity, getUserBadges } from "@/lib/api";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const minutes = Math.floor(d.getMinutes() / 10) * 10;
  return `${d.getHours()}:${String(minutes).padStart(2, "0")}ごろ`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${formatTime(dateStr)}`;
}

const BADGE_ICONS: Record<string, string> = {
  milestone_10: "shoe-print", milestone_50: "star", milestone_100: "party-popper",
  milestone_500: "trophy", milestone_1000: "crown",
  rare_night_owl: "weather-night", rare_early_bird: "weather-sunset-up",
  rare_all_prefectures: "map", rare_repeat_3: "sync", rare_repeat_10: "star-shooting",
  rare_weekend: "music", rare_music: "headphones", rare_ghost: "ghost",
  rare_pref_10: "bag-suitcase", rare_pref_25: "train",
};

const REACTIONS = [
  { type: "like", icon: "heart-outline" as const, iconActive: "heart" as const, label: "いいね", color: "#FF6B6B" },
  { type: "wakaru", icon: "handshake-outline" as const, iconActive: "handshake" as const, label: "わかる", color: "#4A90D9" },
  { type: "ukeru", icon: "emoticon-happy-outline" as const, iconActive: "emoticon-happy" as const, label: "ウケる", color: "#FFB347" },
  { type: "iine_song", icon: "music-note-outline" as const, iconActive: "music-note" as const, label: "いい曲", color: "#1DB954" },
] as const;

export default function EncounterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const encounters = useAppStore((s) => s.encounters);
  const setEncounters = useAppStore((s) => s.setEncounters);
  const encounter = encounters.find((e) => e.id === Number(id));

  const [reaction, setReaction] = useState<string | null>(encounter?.my_reaction_type || null);
  const [badges, setBadges] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (encounter) {
      sendActivity("encounter_view").catch(() => {});
      getUserBadges(encounter.other_user_id).then((r) => setBadges(r.badges)).catch(() => {});
    }
  }, []);

  if (!encounter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>すれちがいが見つかりません</Text>
      </View>
    );
  }

  const handleReaction = async (type: string) => {
    try {
      if (reaction === type) {
        await unlikeEncounter(encounter.id);
        setReaction(null);
      } else {
        await likeEncounter(encounter.id, type);
        setReaction(type);
      }
    } catch {
      Alert.alert("エラー", "操作に失敗しました");
    }
  };

  // ブロック後にホームを更新して戻る
  const refreshAndGoBack = async () => {
    try {
      const { encounters: updated } = await getEncounters(1, 20);
      setEncounters(updated);
    } catch {}
    router.back();
  };

  const handleBlock = () => {
    Alert.alert(
      "ブロック",
      "このユーザーをブロックしますか？\n今後このユーザーとのすれちがいは表示されなくなります",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ブロック",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(encounter.other_user_id);
              Alert.alert("完了", "ブロックしました", [
                { text: "OK", onPress: refreshAndGoBack },
              ]);
            } catch {
              Alert.alert("エラー", "ブロックに失敗しました");
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    const doReport = async (reason: string) => {
      try {
        await reportUser({
          reportedUserId: encounter.other_user_id,
          encounterId: encounter.id,
        reason,
        });
        Alert.alert(
          "通報しました",
          "ご報告ありがとうございます\n内容を確認いたします\n\nこのユーザーをブロックしますか？",
          [
            { text: "ブロックしない", onPress: refreshAndGoBack },
            {
              text: "ブロックする",
              style: "destructive",
              onPress: async () => {
                await blockUser(encounter.other_user_id).catch(() => {});
                refreshAndGoBack();
              },
            },
          ]
        );
      } catch {
        Alert.alert("エラー", "通報に失敗しました");
      }
    };

    Alert.alert("通報", "このユーザーを通報する理由を選んでください", [
      { text: "不適切なひとこと", onPress: () => doReport("inappropriate_hitokoto") },
      { text: "スパム", onPress: () => doReport("spam") },
      { text: "その他", onPress: () => doReport("other") },
      { text: "キャンセル", style: "cancel" },
    ]);
  };

  const openSpotify = () => {
    if (encounter.other_spotify_track_id) {
      Linking.openURL(
        `https://open.spotify.com/track/${encounter.other_spotify_track_id}`
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* アバター */}
      <View style={styles.avatarContainer}>
        <Avatar
          url={encounter.other_avatar_url}
          nickname={encounter.other_nickname}
          size={80}
        />
        <Text style={styles.nickname}>{encounter.other_nickname}</Text>
        <View style={styles.profileTags}>
          {encounter.other_age_group && encounter.other_age_group !== "unset" && (
            <View style={styles.profileTag}>
              <Text style={styles.profileTagText}>
                {{ "10s": "10代", "20s": "20代", "30s": "30代", "40s": "40代", "50s_plus": "50代以上" }[encounter.other_age_group] || ""}
              </Text>
            </View>
          )}
          {encounter.other_gender && encounter.other_gender !== "unset" && (
            <View style={styles.profileTag}>
              <Text style={styles.profileTagText}>
                {{ male: "男性", female: "女性", other: "その他" }[encounter.other_gender] || ""}
              </Text>
            </View>
          )}
          <View style={styles.profileTag}>
            <Text style={styles.profileTagText}>
              すれちがい {encounter.other_encounter_count || 0}人
            </Text>
          </View>
        </View>
      </View>

      {/* バッジ */}
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b.id} style={styles.badgeItem}>
              <MaterialCommunityIcons
                name={(BADGE_ICONS[b.id] || "star") as any}
                size={20}
                color="#E8734A"
              />
            </View>
          ))}
        </View>
      )}

      {/* ひとこと */}
      {encounter.other_hitokoto && (
        <View style={styles.hitokotoCard}>
          <Text style={styles.hitokotoText}>
            「{encounter.other_hitokoto}」
          </Text>
        </View>
      )}

      {/* 音楽 */}
      {encounter.other_spotify_track_name && (
        <View style={styles.musicCard}>
          <Text style={styles.musicTitle}>♪ {encounter.other_spotify_track_name}</Text>
          <Text style={styles.musicArtist}>{encounter.other_spotify_artist_name}</Text>
          <Pressable style={styles.spotifyButton} onPress={openSpotify}>
            <Text style={styles.spotifyButtonText}>Spotifyで聴く</Text>
          </Pressable>
        </View>
      )}

      {/* マップ */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: Number.isFinite(Number(encounter.lat_grid)) ? Number(encounter.lat_grid) : 35.6812,
            longitude: Number.isFinite(Number(encounter.lng_grid)) ? Number(encounter.lng_grid) : 139.7671,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Circle
            center={{
              latitude: Number(encounter.lat_grid),
              longitude: Number(encounter.lng_grid),
            }}
            radius={500}
            fillColor="rgba(74, 144, 217, 0.15)"
            strokeColor="rgba(74, 144, 217, 0.4)"
            strokeWidth={1}
          />
        </MapView>
      </View>

      {/* 場所・時間 */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>場所</Text>
          <Text style={styles.infoText}>
            {encounter.area_name || "不明なエリア"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>時間</Text>
          <Text style={styles.infoText}>
            {formatFullDate(encounter.encountered_at)}
          </Text>
        </View>
        {(encounter.tier || 1) > 1 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>種別</Text>
            <Text style={styles.infoText}>
              {({ 2: "ご近所さん (3km圏内)", 3: "同じ街 (10km圏内)", 4: "同じ地域 (50km圏内)" } as Record<number, string>)[encounter.tier] || ""}
            </Text>
          </View>
        )}
      </View>

      {/* リアクション */}
      {encounter.other_reaction_type && (() => {
        const r = REACTIONS.find((r) => r.type === encounter.other_reaction_type);
        return (
          <View style={[styles.otherReaction, { backgroundColor: (r?.color || "#FF6B6B") + "15" }]}>
            {r && <MaterialCommunityIcons name={r.iconActive} size={16} color={r.color} />}
            <Text style={[styles.otherReactionText, { color: r?.color || "#FF6B6B" }]}>
              相手から「{r?.label || "リアクション"}」が届いています
            </Text>
          </View>
        );
      })()}
      <View style={styles.reactionRow}>
        {REACTIONS.map((r) => {
          const active = reaction === r.type;
          return (
            <Pressable
              key={r.type}
              style={[styles.reactionButton, active && { borderColor: r.color, backgroundColor: r.color + "15" }]}
              onPress={() => handleReaction(r.type)}
            >
              <MaterialCommunityIcons
                name={active ? r.iconActive : r.icon}
                size={24}
                color={active ? r.color : "#999"}
              />
              <Text style={[styles.reactionLabel, active && { color: r.color }]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 通報・ブロック */}
      <View style={styles.actions}>
        <Pressable onPress={handleReport}>
          <Text style={styles.actionText}>通報する</Text>
        </Pressable>
        <Pressable onPress={handleBlock}>
          <Text style={styles.actionText}>ブロック</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  mapContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  errorText: {
    textAlign: "center",
    color: "#999",
    marginTop: 100,
    fontSize: 16,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8734A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "600",
  },
  nickname: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  profileTags: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  profileTag: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  profileTagText: {
    fontSize: 13,
    color: "#666",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },
  badgeItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0E8",
    justifyContent: "center",
    alignItems: "center",
  },
  hitokotoCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 16,
  },
  hitokotoText: {
    fontSize: 17,
    color: "#444",
    textAlign: "center",
    lineHeight: 26,
  },
  musicCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  musicTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  musicArtist: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  spotifyButton: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  spotifyButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  infoCard: {
    width: "100%",
    marginBottom: 28,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  infoText: {
    fontSize: 15,
    color: "#555",
  },
  otherReaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  otherReactionText: {
    fontSize: 13,
    color: "#FF6B6B",
    textAlign: "center",
  },
  reactionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  reactionButton: {
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 70,
  },
  reactionButtonActive: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF0F0",
  },
  reactionLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  reactionLabelActive: {
    color: "#FF6B6B",
  },
  actions: {
    flexDirection: "row",
    gap: 24,
  },
  actionText: {
    fontSize: 14,
    color: "#999",
  },
});
