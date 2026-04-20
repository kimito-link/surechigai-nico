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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const minutes = Math.floor(d.getMinutes() / 10) * 10;
  return `${d.getHours()}:${String(minutes).padStart(2, "0")}`;
}

export default function GhostHistoryScreen() {
  const router = useRouter();
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEncounters(1, 50).then(({ encounters }) => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      setEncounters(
        encounters.filter(
          (e) => e.is_my_ghost && new Date(e.encountered_at).getTime() >= oneDayAgo
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
        <Text style={styles.headerTitle}>おさんぽ結果</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>読み込み中...</Text>
        ) : encounters.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="walk" size={48} color="#CCC" />
            <Text style={styles.emptyText}>おさんぽでのすれちがいはありません</Text>
          </View>
        ) : (
          <>
            <Text style={styles.summaryText}>{encounters.length}人とすれちがいました</Text>
            {encounters.map((enc) => (
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
                  {enc.other_hitokoto ? (
                    <Text style={styles.cardHitokoto} numberOfLines={1}>
                      {enc.other_hitokoto}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    {enc.area_name} ・ {formatTime(enc.encountered_at)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  {Number(enc.other_like) > 0 && (
                    <MaterialCommunityIcons name="heart" size={18} color="#FF6B6B" />
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                </View>
              </Pressable>
            ))}
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
  cardHitokoto: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
