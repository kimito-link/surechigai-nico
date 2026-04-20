import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { getMyStats } from "@/lib/api";

export default function StatsScreen() {
  const [stats, setStats] = useState<{
    totalEncounters: number;
    streakCount: number;
    hourCounts: number[];
    topAreas: { area: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    getMyStats().then(setStats).catch(() => {});
  }, []);

  const totalCount = stats?.totalEncounters ?? 0;
  const streakCount = stats?.streakCount ?? 0;
  const hourCounts = stats?.hourCounts ?? Array(24).fill(0);
  const maxHourCount = Math.max(...hourCounts);
  const peakHour = hourCounts.indexOf(maxHourCount);
  const topAreas = stats?.topAreas ?? [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>すれちがい人数</Text>
        <Text style={styles.summaryCount}>{totalCount}</Text>
        <Text style={styles.summaryUnit}>人</Text>
        <Text style={styles.summaryNote}>※ 直近90日間</Text>
        {streakCount >= 1 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>{streakCount}日連続</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ピーク時間帯</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>
            {totalCount > 0 ? `${peakHour}:00 〜 ${peakHour + 1}:00` : "---"}
          </Text>
          <Text style={styles.infoLabel}>
            {totalCount > 0 ? `${hourCounts[peakHour]}人` : "データなし"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>エリア別ランキング</Text>
        {topAreas.length > 0 ? (
          topAreas.map((item, i) => (
            <View key={item.area} style={styles.rankRow}>
              <Text style={styles.rankNumber}>{i + 1}</Text>
              <Text style={styles.rankArea}>{item.area}</Text>
              <Text style={styles.rankCount}>{item.count}人</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>まだデータがありません</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF4E8",
  },
  summaryCard: {
    backgroundColor: "#E8734A",
    margin: 16,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 56,
    fontWeight: "800",
    color: "#FFF",
  },
  summaryUnit: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  summaryNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
  },
  streakBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFF9F2",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  infoValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  infoLabel: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E8734A",
    width: 30,
  },
  rankArea: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  rankCount: {
    fontSize: 14,
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    paddingVertical: 20,
  },
});
