import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  AppState,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useRouter } from "expo-router";
import { getGhost, placeGhost, removeGhost, getEncounters } from "@/lib/api";
import type { EncounterItem } from "@/lib/api";
import { reverseGeocodeLocal } from "@/lib/geocodeHelper";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/Avatar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// 都道府県の代表座標(マップ表示用)
const PREF_COORDS: Record<string, { lat: number; lng: number }> = {
  "北海道": { lat: 43.06, lng: 141.35 }, "青森県": { lat: 40.82, lng: 140.74 },
  "岩手県": { lat: 39.70, lng: 141.15 }, "宮城県": { lat: 38.27, lng: 140.87 },
  "秋田県": { lat: 39.72, lng: 140.10 }, "山形県": { lat: 38.24, lng: 140.36 },
  "福島県": { lat: 37.75, lng: 140.47 }, "茨城県": { lat: 36.34, lng: 140.45 },
  "栃木県": { lat: 36.57, lng: 139.88 }, "群馬県": { lat: 36.39, lng: 139.06 },
  "埼玉県": { lat: 35.86, lng: 139.65 }, "千葉県": { lat: 35.60, lng: 140.12 },
  "東京都": { lat: 35.69, lng: 139.69 }, "神奈川県": { lat: 35.45, lng: 139.64 },
  "新潟県": { lat: 37.90, lng: 139.02 }, "富山県": { lat: 36.70, lng: 137.21 },
  "石川県": { lat: 36.59, lng: 136.63 }, "福井県": { lat: 36.07, lng: 136.22 },
  "山梨県": { lat: 35.66, lng: 138.57 }, "長野県": { lat: 36.23, lng: 138.18 },
  "岐阜県": { lat: 35.39, lng: 136.72 }, "静岡県": { lat: 34.98, lng: 138.38 },
  "愛知県": { lat: 35.18, lng: 136.91 }, "三重県": { lat: 34.73, lng: 136.51 },
  "滋賀県": { lat: 35.00, lng: 135.87 }, "京都府": { lat: 35.02, lng: 135.76 },
  "大阪府": { lat: 34.69, lng: 135.52 }, "兵庫県": { lat: 34.69, lng: 135.18 },
  "奈良県": { lat: 34.69, lng: 135.80 }, "和歌山県": { lat: 34.23, lng: 135.17 },
  "鳥取県": { lat: 35.50, lng: 134.24 }, "島根県": { lat: 35.47, lng: 133.05 },
  "岡山県": { lat: 34.66, lng: 133.93 }, "広島県": { lat: 34.40, lng: 132.46 },
  "山口県": { lat: 34.19, lng: 131.47 }, "徳島県": { lat: 34.07, lng: 134.56 },
  "香川県": { lat: 34.34, lng: 134.04 }, "愛媛県": { lat: 33.84, lng: 132.77 },
  "高知県": { lat: 33.56, lng: 133.53 }, "福岡県": { lat: 33.61, lng: 130.42 },
  "佐賀県": { lat: 33.25, lng: 130.30 }, "長崎県": { lat: 32.74, lng: 129.87 },
  "熊本県": { lat: 32.79, lng: 130.74 }, "大分県": { lat: 33.24, lng: 131.61 },
  "宮崎県": { lat: 31.91, lng: 131.42 }, "鹿児島県": { lat: 31.56, lng: 130.56 },
  "沖縄県": { lat: 26.21, lng: 127.68 },
};

const ALL_PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const REGIONS: { name: string; prefs: string[] }[] = [
  { name: "北海道・東北", prefs: ALL_PREFECTURES.slice(0, 7) },
  { name: "関東", prefs: ALL_PREFECTURES.slice(7, 14) },
  { name: "中部", prefs: ALL_PREFECTURES.slice(14, 24) },
  { name: "近畿", prefs: ALL_PREFECTURES.slice(24, 30) },
  { name: "中国・四国", prefs: ALL_PREFECTURES.slice(30, 39) },
  { name: "九州・沖縄", prefs: ALL_PREFECTURES.slice(39) },
];

export default function GhostScreen() {
  const router = useRouter();
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const nickname = useAppStore((s) => s.nickname);
  const [ghost, setGhost] = useState<{ area_name: string; municipality: string; prefecture: string; placed_at: string; hitokoto: string | null } | null>(null);
  const [showHitokotoModal, setShowHitokotoModal] = useState(false);
  const [pendingPrefecture, setPendingPrefecture] = useState<string | null>(null);
  const [ghostHitokoto, setGhostHitokoto] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [currentPrefecture, setCurrentPrefecture] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [canPlaceAfter, setCanPlaceAfter] = useState<string | null>(null);
  const [activePrefectures, setActivePrefectures] = useState<Set<string>>(new Set());
  const [ghostEncounters, setGhostEncounters] = useState<EncounterItem[]>([]);

  const checkPermissionAndLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationGranted(false);
        setLoading(false);
        return;
      }
      setLocationGranted(true);

      // 現在地の都道府県を取得
      const loc = await Location.getLastKnownPositionAsync();
      if (loc) {
        const pref = await reverseGeocodeLocal(loc.coords.latitude, loc.coords.longitude);
        setCurrentPrefecture(pref);
      }
    } catch {
      setLocationGranted(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkPermissionAndLocation();
    getGhost().then((r) => {
      if (r.ghost) {
        // 24時間経過していたら自動帰還
        const diff = Date.now() - new Date(r.ghost.placed_at).getTime();
        if (diff >= 24 * 60 * 60 * 1000) {
          removeGhost(true).catch(() => {});
          setGhost(null);
          setCanPlaceAfter(null);
        } else {
          setGhost({ ...r.ghost, hitokoto: r.ghost.hitokoto || null });
        }
      }
      setCanPlaceAfter(r.canPlaceAfter || null);
      if (r.activePrefectures) {
        setActivePrefectures(new Set(r.activePrefectures));
      }
      // おさんぽのすれちがいを取得(自分のbotのみ)
      getEncounters(1, 50).then(({ encounters }) => {
        const myGhost = encounters.filter((e) => e.is_my_ghost);
        if (r.ghost && !((Date.now() - new Date(r.ghost.placed_at).getTime()) >= 24 * 60 * 60 * 1000)) {
          const placedTime = new Date(r.ghost.placed_at).getTime();
          setGhostEncounters(myGhost.filter((e) => new Date(e.encountered_at).getTime() >= placedTime));
        } else {
          // おさんぽ中でない場合: 直近24時間を前回結果として表示
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          setGhostEncounters(myGhost.filter((e) => new Date(e.encountered_at).getTime() >= oneDayAgo));
        }
      }).catch(() => {});
    }).catch(() => {});
  }, [checkPermissionAndLocation]);

  // 設定から戻った時・タブ復帰時に権限を再チェック
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkPermissionAndLocation();
      }
    });
    return () => sub.remove();
  }, [checkPermissionAndLocation]);

  const handlePlace = (prefecture: string) => {
    Alert.alert(
      `${prefecture}におさんぽ`,
      `${prefecture}のどこかの街にランダムで遊びに行きます\nよろしいですか?`,
      [
        { text: "やめる", style: "cancel" },
        {
          text: "出発する",
          onPress: () => {
            setPendingPrefecture(prefecture);
            setGhostHitokoto("");
            setShowHitokotoModal(true);
          },
        },
      ]
    );
  };

  const handleConfirmPlace = async () => {
    if (!pendingPrefecture) return;
    setShowHitokotoModal(false);
    setPlacing(true);
    try {
      const trimmed = ghostHitokoto.trim() || undefined;
      const result = await placeGhost(pendingPrefecture, trimmed);
      setGhost({
        area_name: result.ghost.area_name,
        municipality: result.ghost.municipality,
        prefecture: result.ghost.prefecture,
        placed_at: new Date().toISOString(),
        hitokoto: result.ghost.hitokoto,
      });
      setSelectedRegion(null);
      Alert.alert("おさんぽに出発!", `${result.ghost.municipality}ですれちがいを待っています`);
    } catch (e: unknown) {
      Alert.alert("エラー", e instanceof Error ? e.message : "配置に失敗しました");
    } finally {
      setPlacing(false);
      setPendingPrefecture(null);
    }
  };

  const handleRemove = async () => {
    const remainHours = ghost
      ? Math.max(1, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - new Date(ghost.placed_at).getTime())) / (60 * 60 * 1000)))
      : 24;
    Alert.alert(
      "おさんぽ終了",
      `今帰ると次のおさんぽまで${remainHours}時間待つ必要があります\n24時間経てば待たずにすぐ出発できます`,
      [
        { text: "もう少し続ける", style: "cancel" },
        {
          text: "帰ってくる",
          style: "destructive",
          onPress: async () => {
            await removeGhost().catch(() => {});
            setGhost(null);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // 位置情報未許可
  if (!locationGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>位置情報の許可が必要です</Text>
          <Text style={styles.permissionDesc}>
            おさんぽには位置情報の許可が必要です{"\n"}
            現在地と同じ場所には行けないため{"\n"}
            あなたの位置情報を確認しています
          </Text>
          <Pressable style={styles.permissionButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.permissionButtonText}>設定を開く</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 現在の分身状態 */}
      {ghost ? (
        <>
          {/* マップ */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: PREF_COORDS[ghost.prefecture]?.lat ?? 35.69,
                longitude: PREF_COORDS[ghost.prefecture]?.lng ?? 139.69,
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: PREF_COORDS[ghost.prefecture]?.lat ?? 35.69,
                  longitude: PREF_COORDS[ghost.prefecture]?.lng ?? 139.69,
                }}
                title={ghost.municipality}
              >
                <View style={styles.mapGhostMarker}>
                  <Avatar url={avatarUrl} nickname={nickname} size={40} />
                </View>
              </Marker>
            </MapView>
            <View style={styles.mapOverlay}>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>おさんぽ中</Text>
              </View>
            </View>
          </View>

          {/* ステータスカード */}
          <View style={styles.ghostCard}>
            <View style={styles.ghostHeader}>
              <View style={styles.ghostAvatarWrap}>
                <Avatar url={avatarUrl} nickname={nickname} size={56} />
                <View style={styles.ghostBadge}>
                  <Text style={styles.ghostBadgeText}>おさんぽ中</Text>
                </View>
              </View>
              <View style={styles.ghostInfo}>
                <Text style={styles.ghostNickname}>{nickname}</Text>
                <Text style={styles.ghostArea}>{ghost.area_name}</Text>
                {ghost.hitokoto ? (
                  <Text style={styles.ghostHitokoto}>「{ghost.hitokoto}」</Text>
                ) : null}
                <Text style={styles.ghostRemaining}>
                  あと{Math.max(1, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - new Date(ghost.placed_at).getTime())) / (60 * 60 * 1000)))}時間
                </Text>
              </View>
            </View>
            <Pressable style={styles.removeButton} onPress={handleRemove}>
              <Text style={styles.removeButtonText}>早めに帰る</Text>
            </Pressable>
          </View>

          {/* おさんぽ先でのすれちがい */}
          <View style={styles.ghostEncountersSection}>
            <Text style={styles.ghostEncountersTitle}>
              おさんぽ先でのすれちがい ({ghostEncounters.length}人)
            </Text>
            {ghostEncounters.length === 0 ? (
              <View style={styles.ghostEncountersEmpty}>
                <MaterialCommunityIcons name="walk" size={32} color="#CCC" />
                <Text style={styles.ghostEncountersEmptyText}>
                  まだ誰ともすれちがっていません{"\n"}
                  {ghost.municipality}の人を探しています...
                </Text>
              </View>
            ) : (
              ghostEncounters.map((enc) => (
                <Pressable
                  key={enc.id}
                  style={styles.ghostEncounterCard}
                  onPress={() => router.push(`/encounter/${enc.id}`)}
                >
                  <Avatar
                    url={enc.other_avatar_url}
                    nickname={enc.other_nickname}
                    size={40}
                  />
                  <View style={styles.ghostEncounterInfo}>
                    <Text style={styles.ghostEncounterName}>{enc.other_nickname}</Text>
                    {enc.other_hitokoto ? (
                      <Text style={styles.ghostEncounterHitokoto} numberOfLines={1}>
                        {enc.other_hitokoto}
                      </Text>
                    ) : null}
                  </View>
                  {Number(enc.other_like) > 0 && (
                    <MaterialCommunityIcons name="heart" size={16} color="#FF6B6B" />
                  )}
                </Pressable>
              ))
            )}
          </View>
        </>
      ) : (
        <View style={[styles.introCard, { marginHorizontal: 20, marginTop: 20 }]}>
          <View style={styles.introAvatarWrap}>
            <Avatar url={avatarUrl} nickname={nickname} size={72} />
            <View style={[styles.ghostBadge, { bottom: -2, right: -2 }]}>
              <Text style={styles.ghostBadgeText}>おさんぽ</Text>
            </View>
          </View>
          <Text style={styles.introTitle}>おさんぽに出かけよう</Text>
          <Text style={styles.introDesc}>
            自分を別の街に送り出して{"\n"}
            その街の人とすれちがえます{"\n\n"}
            1日1回 行き先を選べます
          </Text>
        </View>
      )}

      {/* 地方選択 */}
      {!ghost && canPlaceAfter && new Date(canPlaceAfter).getTime() > Date.now() && (
        <View style={[styles.cooldownCard, { marginHorizontal: 20 }]}>
          <Text style={styles.cooldownText}>
            次のおさんぽまであと{Math.max(1, Math.ceil((new Date(canPlaceAfter).getTime() - Date.now()) / (60 * 60 * 1000)))}時間
          </Text>
        </View>
      )}
      {/* 前回のおさんぽ結果 */}
      {!ghost && ghostEncounters.length > 0 && (() => {
        const area = ghostEncounters[0]?.area_name || "";
        return (
          <Pressable
            style={styles.lastResultLink}
            onPress={() => router.push("/ghost-history")}
          >
            <MaterialCommunityIcons name="walk" size={20} color="#50C878" />
            <View style={{ flex: 1 }}>
              <Text style={styles.lastResultLinkText}>
                前回のおさんぽ結果 ({ghostEncounters.length}人)
              </Text>
              <Text style={styles.lastResultLinkSub}>{area}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
          </Pressable>
        );
      })()}

      {!ghost && (!canPlaceAfter || new Date(canPlaceAfter).getTime() <= Date.now()) && (
        <View style={[styles.regionSection, { paddingHorizontal: 20 }]}>
          <Text style={styles.sectionTitle}>行き先を選ぶ</Text>
          {currentPrefecture && (
            <Text style={styles.currentPrefText}>
              現在地: {currentPrefecture}(選択不可)
            </Text>
          )}
          {REGIONS.map((region) => (
            <View key={region.name}>
              <Pressable
                style={styles.regionHeader}
                onPress={() => setSelectedRegion(selectedRegion === region.name ? null : region.name)}
              >
                <Text style={styles.regionName}>{region.name}</Text>
                <Text style={styles.regionArrow}>
                  {selectedRegion === region.name ? "▼" : "▶"}
                </Text>
              </Pressable>
              {selectedRegion === region.name && (
                <View style={styles.prefGrid}>
                  {region.prefs.map((pref) => {
                    const isCurrent = pref === currentPrefecture;
                    const isActive = activePrefectures.has(pref);
                    const isDisabled = isCurrent || !isActive;
                    return (
                      <Pressable
                        key={pref}
                        style={[styles.prefButton, isDisabled && styles.prefButtonDisabled]}
                        disabled={isDisabled || placing}
                        onPress={() => handlePlace(pref)}
                      >
                        <Text style={[styles.prefButtonText, isDisabled && styles.prefButtonTextDisabled]}>
                          {pref}
                        </Text>
                        {isCurrent && <Text style={styles.prefCurrentLabel}>現在地</Text>}
                        {!isCurrent && !isActive && <Text style={styles.prefCurrentLabel}>人がいません</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {/* 旅のひとことモーダル */}
      <Modal
        visible={showHitokotoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHitokotoModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{pendingPrefecture}へおさんぽ</Text>
            <Text style={styles.modalDesc}>
              旅のひとことを設定できます{"\n"}おさんぽ先で出会った人に表示されます
            </Text>
            <TextInput
              style={styles.modalInput}
              value={ghostHitokoto}
              onChangeText={setGhostHitokoto}
              maxLength={100}
              placeholder="例: ラーメン食べに来ました!"
              placeholderTextColor="#BBB"
              multiline
              autoFocus
            />
            <Text style={styles.modalCount}>{ghostHitokoto.length}/100</Text>
            <Pressable style={styles.modalButton} onPress={handleConfirmPlace}>
              <Text style={styles.modalButtonText}>出発する</Text>
            </Pressable>
            <Pressable
              style={styles.modalSkip}
              onPress={() => {
                setGhostHitokoto("");
                handleConfirmPlace();
              }}
            >
              <Text style={styles.modalSkipText}>スキップ</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // 権限なし
  permissionBox: {
    margin: 20,
    marginTop: 80,
    padding: 32,
    backgroundColor: "#FFF9F2",
    borderRadius: 20,
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  permissionDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // マップ
  mapContainer: {
    height: 220,
    backgroundColor: "#E8E8E8",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapGhostMarker: {
    borderWidth: 3,
    borderColor: "#50C878",
    borderRadius: 23,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  mapOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  mapBadge: {
    backgroundColor: "#50C878",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapBadgeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  // 配置済み
  ghostCard: {
    backgroundColor: "#FFF9F2",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -20,
    borderWidth: 2,
    borderColor: "#50C878",
    zIndex: 1,
  },
  ghostHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ghostAvatarWrap: {
    position: "relative",
  },
  ghostBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#50C878",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ghostBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
  },
  ghostInfo: {
    flex: 1,
  },
  ghostNickname: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  ghostArea: {
    fontSize: 15,
    color: "#50C878",
    fontWeight: "600",
    marginTop: 4,
  },
  ghostDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  cooldownCard: {
    backgroundColor: "#FFF9F2",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  cooldownText: {
    fontSize: 15,
    color: "#999",
    fontWeight: "600",
  },
  ghostRemaining: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  removeButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#BBB",
    fontSize: 13,
  },
  // 未配置
  introCard: {
    backgroundColor: "#FFF9F2",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
  },
  introAvatarWrap: {
    position: "relative",
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  introDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  // 地方・都道府県選択
  regionSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  currentPrefText: {
    fontSize: 12,
    color: "#E8734A",
    marginBottom: 12,
  },
  regionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  regionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  regionArrow: {
    fontSize: 12,
    color: "#999",
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    marginBottom: 8,
  },
  prefButton: {
    backgroundColor: "#50C878",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  prefButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  prefButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  prefButtonTextDisabled: {
    color: "#BBB",
  },
  prefCurrentLabel: {
    fontSize: 9,
    color: "#BBB",
    textAlign: "center",
    marginTop: 2,
  },
  ghostHitokoto: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    marginTop: 4,
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalCount: {
    fontSize: 12,
    color: "#BBB",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#50C878",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
  modalSkip: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSkipText: {
    color: "#999",
    fontSize: 14,
  },
  lastResultLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  lastResultLinkText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  lastResultLinkSub: {
    fontSize: 12,
    color: "#50C878",
    marginTop: 2,
  },
  // おさんぽ先すれちがい
  ghostEncountersSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  ghostEncountersTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  ghostEncountersEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#FFF9F2",
    borderRadius: 16,
  },
  ghostEncountersEmptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
  },
  ghostEncounterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  ghostEncounterInfo: {
    flex: 1,
  },
  ghostEncounterName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  ghostEncounterHitokoto: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
});
