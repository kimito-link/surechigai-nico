import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getBadges, getPrefectures } from "@/lib/api";
import type { BadgeItem } from "@/lib/api";
import { JapanMap } from "@/components/JapanMap";

// サーバーの絵文字が表示できない場合のフォールバック
const BADGE_ICONS: Record<string, string> = {
  milestone_10: "shoe-print", milestone_50: "star", milestone_100: "party-popper",
  milestone_500: "trophy", milestone_1000: "crown",
  rare_night_owl: "weather-night", rare_early_bird: "weather-sunset-up",
  rare_all_prefectures: "map", rare_repeat_3: "sync", rare_repeat_10: "star-shooting",
  rare_weekend: "music", rare_music: "headphones", rare_ghost: "ghost",
  rare_pref_10: "bag-suitcase", rare_pref_25: "train",
};

function BadgeCard({ badge }: { badge: BadgeItem }) {
  const earned = badge.earned_at != null;
  const iconName = BADGE_ICONS[badge.id] || "star";
  return (
    <View style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
      <MaterialCommunityIcons
        name={(earned ? iconName : "lock") as any}
        size={32}
        color={earned ? "#E8734A" : "#CCC"}
      />
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>
        {badge.name}
      </Text>
      <Text style={[styles.badgeDesc, !earned && styles.badgeDescLocked]}>
        {badge.description}
      </Text>
      {earned && badge.earned_at && (
        <Text style={styles.badgeDate}>
          {new Date(badge.earned_at).toLocaleDateString("ja-JP")}
        </Text>
      )}
    </View>
  );
}

export default function BadgesScreen() {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [stats, setStats] = useState<{ totalEncounters: number; prefectureCount: number } | null>(null);
  const [filledPrefectures, setFilledPrefectures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getBadges().then((r) => { setBadges(r.badges); setStats(r.stats); }),
      getPrefectures().then((r) => setFilledPrefectures(r.prefectures.map((p) => p.prefecture))),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const earnedCount = badges.filter((b) => b.earned_at).length;
  const milestones = badges.filter((b) => b.category === "milestone");
  const rares = badges.filter((b) => b.category === "rare");
  const seasonals = badges.filter((b) => b.category === "seasonal");

  const sections = [
    { title: "マイルストーン", badges: milestones },
    { title: "レア", badges: rares },
    { title: "シーズン", badges: seasonals },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>コレクション</Text>
        <Text style={styles.headerSub}>
          {earnedCount} / {badges.length} 獲得
        </Text>
      </View>

      {/* 統計サマリー */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalEncounters}</Text>
            <Text style={styles.statLabel}>すれちがい人数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.prefectureCount}</Text>
            <Text style={styles.statLabel}>都道府県</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnedCount}</Text>
            <Text style={styles.statLabel}>バッジ</Text>
          </View>
        </View>
      )}

      {/* すれちがいマップ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>すれちがいマップ</Text>
        <View style={styles.mapCard}>
          <JapanMap filledPrefectures={filledPrefectures} />
          <Text style={styles.mapCount}>
            {filledPrefectures.length} / 47 都道府県
          </Text>
          {filledPrefectures.length >= 47 && (
            <Text style={styles.mapComplete}>全国制覇!</Text>
          )}
        </View>
      </View>

      {/* バッジセクション */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.badgeGrid}>
            {section.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF4E8",
  },
  content: {
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 100,
    color: "#999",
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  headerSub: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF9F2",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E8734A",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EEE",
    marginVertical: 4,
  },
  mapCard: {
    backgroundColor: "#FFF9F2",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    alignItems: "center",
  },
  mapCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  mapComplete: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E8734A",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  badgeCard: {
    width: "30%",
    backgroundColor: "#FFF9F2",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E8D8",
  },
  badgeCardLocked: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E8E8E8",
  },
  badgeName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  badgeNameLocked: {
    color: "#BBB",
  },
  badgeDesc: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
    marginTop: 2,
  },
  badgeDescLocked: {
    color: "#CCC",
  },
  badgeDate: {
    fontSize: 9,
    color: "#BBB",
    marginTop: 4,
  },
});
