import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { getProfile, updateProfile, deleteAccount, getEncounters, seedTestData, runDebugMatcher, scatterTestUsers } from "@/lib/api";
import { clearLocalState } from "@/lib/storage";
import { Avatar } from "@/components/Avatar";
import { useAppStore } from "@/store";

export default function SettingsScreen() {
  const router = useRouter();
  const { nickname, avatarUrl, spotifyTrackName, spotifyArtistName, setProfile } =
    useAppStore();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [ageGroup, setAgeGroup] = useState("unset");
  const [gender, setGender] = useState("unset");
  const [showAgeGroup, setShowAgeGroup] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [seeding, setSeedingType] = useState<false | "near" | "far">(false);
  const [scattering, setScattering] = useState(false);
  const [matching, setMatching] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await getProfile();
        setProfile({
          nickname: user.nickname as string,
          hitokoto: (user.hitokoto as string) || "",
          avatarUrl: user.avatar_url as string | null,
          spotifyTrackName: user.spotify_track_name as string | null,
          spotifyArtistName: user.spotify_artist_name as string | null,
          streakCount: (user.streak_count as number) || 0,
        });
        setAgeGroup((user.age_group as string) || "unset");
        setGender((user.gender as string) || "unset");
        setShowAgeGroup(Boolean(user.show_age_group));
        setShowGender(Boolean(user.show_gender));
        // OS側の通知許可状態を取得してDBと同期
        const { status } = await Notifications.getPermissionsAsync();
        const osEnabled = status === "granted";
        setNotificationEnabled(osEnabled);

        // DBと食い違っていたら同期
        if (osEnabled !== Boolean(user.notification_enabled)) {
          await updateProfile({ notification_enabled: osEnabled }).catch(() => {});
        }
      } catch (e) {
        // オフライン時はローカルの値を使う
      }
    })();
  }, [setProfile]);

  const handleToggleNotification = async (value: boolean) => {
    setNotificationEnabled(value);
    try {
      await updateProfile({ notification_enabled: value });
    } catch {
      setNotificationEnabled(!value);
    }
  };

  const handleSaveNickname = async () => {
    const name = tempNickname.trim();
    if (!name) {
      Alert.alert("エラー", "ニックネームを入力してください");
      return;
    }
    try {
      await updateProfile({ nickname: name });
      setProfile({ nickname: name });
      setEditingNickname(false);
    } catch {
      Alert.alert("エラー", "ニックネームの保存に失敗しました");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "データを削除",
      "すべてのすれちがい履歴と設定が削除されます\nこの操作は取り消せません",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await clearLocalState();
              useAppStore.getState().setProfile({
                nickname: "匿名さん",
                hitokoto: "",
                avatarUrl: null,
                avatarConfig: null,
                spotifyTrackName: null,
                spotifyArtistName: null,
                streakCount: 0,
              });
              useAppStore.getState().setEncounters([]);
              useAppStore.getState().setAuth("", 0);
              router.replace("/onboarding");
            } catch {
              Alert.alert("エラー", "削除に失敗しました");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* プロフィール */}
      <Text style={styles.sectionTitle}>プロフィール</Text>
      <View style={styles.section}>
        <View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ニックネーム</Text>
            {!editingNickname && (
              <Pressable onPress={() => { setTempNickname(nickname); setEditingNickname(true); }}>
                <Text style={styles.rowLink}>変更</Text>
              </Pressable>
            )}
          </View>
          {editingNickname ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={tempNickname}
                onChangeText={setTempNickname}
                maxLength={20}
                placeholder="ニックネーム"
                placeholderTextColor="#BBB"
              />
              <Pressable style={styles.saveButton} onPress={handleSaveNickname}>
                <Text style={styles.saveButtonText}>保存</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.hitokotoText}>{nickname}</Text>
          )}
        </View>
        <View style={styles.separator} />
        <Pressable style={styles.row} onPress={() => router.push("/avatar-editor")}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar url={avatarUrl} nickname={nickname} size={48} />
            <Text style={styles.rowLabel}>アバター</Text>
          </View>
          <Text style={styles.rowLink}>変更</Text>
        </Pressable>
      </View>

      {/* 年代・性別 */}
      <Text style={styles.sectionTitle}>年代・性別</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>年代</Text>
        </View>
        <View style={styles.chipRow}>
          {([
            ["unset", "未設定"],
            ["10s", "10代"],
            ["20s", "20代"],
            ["30s", "30代"],
            ["40s", "40代"],
            ["50s_plus", "50代以上"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              style={[styles.chip, ageGroup === value && styles.chipActive]}
              onPress={async () => {
                setAgeGroup(value);
                const show = value !== "unset";
                setShowAgeGroup(show);
                await updateProfile({ age_group: value, show_age_group: show }).catch(() => {});
              }}
            >
              <Text style={[styles.chipText, ageGroup === value && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.separator} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>性別</Text>
        </View>
        <View style={styles.chipRow}>
          {([
            ["unset", "未設定"],
            ["male", "男性"],
            ["female", "女性"],
            ["other", "その他"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              style={[styles.chip, gender === value && styles.chipActive]}
              onPress={async () => {
                setGender(value);
                const show = value !== "unset";
                setShowGender(show);
                await updateProfile({ gender: value, show_gender: show }).catch(() => {});
              }}
            >
              <Text style={[styles.chipText, gender === value && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 音楽設定 */}
      <Text style={styles.sectionTitle}>音楽設定</Text>
      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={() => router.push("/song-search")}
        >
          <View style={{ flex: 1 }}>
            {spotifyTrackName ? (
              <>
                <Text style={styles.rowLabel}>♪ {spotifyTrackName}</Text>
                <Text style={styles.rowSub}>{spotifyArtistName}</Text>
              </>
            ) : (
              <Text style={styles.rowLabel}>曲を設定する</Text>
            )}
          </View>
          <Text style={styles.rowLink}>変更</Text>
        </Pressable>
      </View>

      {/* 通知 */}
      <Text style={styles.sectionTitle}>通知</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>すれちがい通知</Text>
          <Switch
            value={notificationEnabled}
            onValueChange={handleToggleNotification}
            trackColor={{ true: "#E8734A" }}
          />
        </View>
      </View>

      {/* アカウント */}
      <Text style={styles.sectionTitle}>アカウント</Text>
      <View style={styles.section}>
        <Pressable style={styles.row} onPress={() => router.push({ pathname: "/webview-page", params: { path: "api/pages/privacy-policy", title: "プライバシーポリシー" } })}>
          <Text style={styles.rowLabel}>プライバシーポリシー</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.row} onPress={() => router.push({ pathname: "/webview-page", params: { path: "api/pages/terms", title: "利用規約" } })}>
          <Text style={styles.rowLabel}>利用規約</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.row} onPress={handleDeleteAccount}>
          <Text style={[styles.rowLabel, { color: "#FF3B30" }]}>
            データを削除
          </Text>
        </Pressable>
      </View>

      {/* デバッグ（開発環境のみ） */}
      {__DEV__ && (
        <>
          <Text style={styles.sectionTitle}>デバッグ</Text>
          <View style={styles.section}>
            <Pressable
              style={[styles.row, seeding && { opacity: 0.5 }]}
              disabled={!!seeding}
              onPress={async () => {
                if (seeding) return;
                setSeedingType("near");
                try {
                  const result = await seedTestData(false);
                  const { encounters } = await getEncounters(1, 20);
                  useAppStore.getState().setEncounters(encounters);
                  Alert.alert("完了", result.message);
                } catch {
                  Alert.alert("エラー", "テストデータ生成に失敗しました");
                } finally {
                  setSeedingType(false);
                }
              }}
            >
              <Text style={styles.rowLabel}>
                {seeding === "near" ? "生成中..." : "テストデータ生成（近距離）"}
              </Text>
              <Text style={styles.rowSub}>
                {seeding === "near" ? "エリア名を取得しています（約5秒）" : "東京周辺のすれちがい5件"}
              </Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={[styles.row, seeding && { opacity: 0.5 }]}
              disabled={!!seeding}
              onPress={async () => {
                if (seeding) return;
                setSeedingType("far");
                try {
                  const result = await seedTestData(true);
                  const { encounters } = await getEncounters(1, 20);
                  useAppStore.getState().setEncounters(encounters);
                  Alert.alert("完了", result.message);
                } catch {
                  Alert.alert("エラー", "テストデータ生成に失敗しました");
                } finally {
                  setSeedingType(false);
                }
              }}
            >
              <Text style={styles.rowLabel}>
                {seeding === "far" ? "生成中..." : "テストデータ生成（遠距離）"}
              </Text>
              <Text style={styles.rowSub}>
                {seeding === "far" ? "エリア名を取得しています（約5秒）" : "全国各地のすれちがい5件"}
              </Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={[styles.row, scattering && { opacity: 0.5 }]}
              disabled={scattering}
              onPress={async () => {
                if (scattering) return;
                setScattering(true);
                try {
                  const result = await scatterTestUsers(20);
                  Alert.alert("完了", `${result.message}\n\n${result.summary}`);
                } catch {
                  Alert.alert("エラー", "配置に失敗しました");
                } finally {
                  setScattering(false);
                }
              }}
            >
              <Text style={styles.rowLabel}>
                {scattering ? "配置中..." : "ユーザーを全国にばらまく"}
              </Text>
              <Text style={styles.rowSub}>
                {scattering ? "ダミーユーザーを配置しています" : "20人をランダムな市区町村に配置"}
              </Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={[styles.row, matching && { opacity: 0.5 }]}
              disabled={matching}
              onPress={async () => {
                if (matching) return;
                setMatching(true);
                try {
                  const result = await runDebugMatcher();
                  const detail = result.results
                    .filter((r) => r.matches.length > 0)
                    .map((r) => `T${r.tier}(${r.label}): ${r.matches.length}件`)
                    .join("\n") || "マッチなし";
                  const { encounters } = await getEncounters(1, 20);
                  useAppStore.getState().setEncounters(encounters);
                  const notifSample = result.notifications?.slice(0, 3)
                    .map((n) => `  ${n}`)
                    .join("\n") || "";
                  const notifInfo = notifSample
                    ? `\n\n通知サンプル:\n${notifSample}${result.notifications.length > 3 ? `\n  ...他${result.notifications.length - 3}件` : ""}`
                    : "";
                  Alert.alert(
                    result.message,
                    `0件ユーザー: ${result.zeroEncounterUsers}人\n${detail}${notifInfo}`
                  );
                } catch {
                  Alert.alert("エラー", "マッチング実行に失敗しました");
                } finally {
                  setMatching(false);
                }
              }}
            >
              <Text style={styles.rowLabel}>
                {matching ? "実行中..." : "ティア制マッチング実行"}
              </Text>
              <Text style={styles.rowSub}>
                {matching ? "マッチング中..." : "500m→3km→10km→50kmの段階マッチング"}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF4E8",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  section: {
    backgroundColor: "#FFF9F2",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
    color: "#333",
  },
  rowValue: {
    fontSize: 16,
    color: "#999",
  },
  rowSub: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  rowLink: {
    fontSize: 16,
    color: "#E8734A",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  chipActive: {
    backgroundColor: "#E8734A",
  },
  chipText: {
    fontSize: 14,
    color: "#666",
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  hitokotoText: {
    fontSize: 14,
    color: "#666",
    paddingBottom: 14,
  },
  topicBanner: {
    backgroundColor: "#FFF0E8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  topicLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E8734A",
    marginBottom: 4,
  },
  topicText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  topicHint: {
    fontSize: 12,
    color: "#E8734A",
    marginBottom: 8,
  },
  ghostDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    paddingBottom: 12,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
