import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Image, AppState } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

export default function PermissionNotificationScreen() {
  const router = useRouter();
  const waitingForReturn = useRef(false);

  // OS設定から戻ってきた時のハンドリング
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && waitingForReturn.current) {
        waitingForReturn.current = false;
        router.replace("/permission-location");
      }
    });
    return () => sub.remove();
  }, [router]);

  const handleAllow = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    // すぐ結果が返ってきた場合(ダイアログで許可/拒否した場合)はそのまま遷移
    // OS設定に飛んだ場合はAppStateで検知して遷移する
    if (AppState.currentState === "active") {
      router.replace("/permission-location");
    } else {
      waitingForReturn.current = true;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>通知を許可してください</Text>
        <Text style={styles.description}>
          すれちがいが発生した時に{"\n"}
          プッシュ通知でお知らせします{"\n\n"}
          通知がないとすれちがいに{"\n"}
          気づけなくなります
        </Text>
        <Image
          source={require("../assets/notification-illustration.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={handleAllow}>
          <Text style={styles.buttonText}>通知を許可する</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/permission-location")}>
          <Text style={styles.skipText}>あとで</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    justifyContent: "space-between",
    paddingTop: 120,
    paddingBottom: 60,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
  },
  illustration: {
    width: 280,
    height: 280,
    marginTop: 30,
  },
  footer: {
    alignItems: "center",
  },
  button: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  skipText: {
    color: "#999",
    fontSize: 14,
  },
});
