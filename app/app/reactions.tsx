import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { getEncounters } from "@/lib/api";
import type { EncounterItem } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const REACTION_INFO: Record<string, { icon: "heart" | "handshake" | "emoticon-happy" | "music-note"; color: string; label: string }> = {
  like: { icon: "heart", color: "#FF6B6B", label: "いいね" },
  wakaru: { icon: "handshake", color: "#4A90D9", label: "わかる" },
  ukeru: { icon: "emoticon-happy", color: "#FFB347", label: "ウケる" },
  iine_song: { icon: "music-note", color: "#1DB954", label: "いい曲" },
};

export default function ReactionsScreen() {
  const router = useRouter();
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEncounters(1, 50).then(({ encounters }) => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      setEncounters(
        encounters.filter(
          (e) => Number(e.other_like) > 0 && new Date(e.encountered_at).getTime() >= oneDayAgo
        )
      );
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>リアクション</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>読み込み中...</Text>
        ) : encounters.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="heart-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>リアクションはまだありません</Text>
          </View>
        ) : (
          <>
            <Text style={styles.summaryText}>{encounters.length}人からリアクションが届いています</Text>
            {encounters.map((enc) => {
              const r = REACTION_INFO[enc.other_reaction_type || "like"] || REACTION_INFO.like;
              return (
                <Pressable
                  key={enc.id}
                  style={styles.card}
                  onPress={() => router.push(`/encounter/${enc.id}`)}
                >
                  <Avatar
                    url={enc.other_avatar_url}
                    nickname={enc.other_nickname}
                    size={48}
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{enc.other_nickname}</Text>
                    <Text style={styles.cardArea}>
                      {enc.area_name || "不明なエリア"}
                    </Text>
                  </View>
                  <View style={[styles.reactionBadge, { backgroundColor: r.color + "15", borderColor: r.color + "30" }]}>
                    <MaterialCommunityIcons name={r.icon} size={16} color={r.color} />
                    <Text style={[styles.reactionLabel, { color: r.color }]}>{r.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF4E8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF9F2",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 80,
    color: "#999",
    fontSize: 16,
  },
  empty: {
    alignItems: "center",
    marginTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  summaryText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cardArea: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
