import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { updateProfile, registerUser, getTodayTopic } from "@/lib/api";
import { getUuid, setUuid, setProfileSet, generateUuid } from "@/lib/storage";
import { useAppStore } from "@/store";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const [nickname, setNickname] = useState("");
  const [hitokoto, setHitokoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [todayTopic, setTodayTopic] = useState<string | null>(null);

  useEffect(() => {
    getTodayTopic().then((r) => setTodayTopic(r.topic)).catch(() => {});
  }, []);

  const handleStart = async () => {
    const name = nickname.trim();
    if (!name) {
      Alert.alert("", "ニックネームを入力してください");
      return;
    }

    setSaving(true);
    try {
      // UUIDがない場合は新規生成して登録
      let uuid = await getUuid();
      if (!uuid) {
        uuid = generateUuid();
        await setUuid(uuid);
      }
      await registerUser(uuid).catch(() => {});

      await updateProfile({
        nickname: name,
        hitokoto: hitokoto.trim() || null,
      });
      setProfile({ nickname: name, hitokoto: hitokoto.trim() });
      await setProfileSet();
      router.replace("/permission-notification");
    } catch (error) {
      Alert.alert("エラー", "プロフィールの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>プロフィールを設定しよう</Text>
      <Text style={styles.subheading}>あとからいつでも変更できます</Text>

      <View style={styles.field}>
        <Text style={styles.label}>ニックネーム</Text>
        <Text style={styles.fieldDesc}>すれちがった相手に表示されます</Text>
        <TextInput
          style={styles.input}
          placeholder="ニックネームを入力"
          placeholderTextColor="#BBB"
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
        />
        <Text style={styles.hint}>{nickname.length}/20</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>ひとこと</Text>
        <Text style={styles.fieldDesc}>
          すれちがった相手に表示されます{"\n"}
          好きなことを自由に書いてOK
        </Text>
        {todayTopic && (
          <View style={styles.topicBanner}>
            <Text style={styles.topicLabel}>今日のお題(参考にどうぞ)</Text>
            <Text style={styles.topicText}>{todayTopic}</Text>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="今の気分や好きなことをひとことで"
          placeholderTextColor="#BBB"
          value={hitokoto}
          onChangeText={setHitokoto}
          maxLength={100}
        />
        <Text style={styles.hint}>{hitokoto.length}/100</Text>
      </View>

      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "保存中..." : "はじめる！"}
        </Text>
      </Pressable>
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
    paddingTop: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: "#999",
    marginBottom: 40,
  },
  field: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  fieldDesc: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  topicBanner: {
    backgroundColor: "#FFF0E8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  topicLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E8734A",
    marginBottom: 2,
  },
  topicText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  hint: {
    textAlign: "right",
    color: "#BBB",
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: "#E8734A",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
