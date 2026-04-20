import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Image, AppState } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

export default function PermissionLocationScreen() {
  const router = useRouter();
  const waitingForReturn = useRef(false);

  // OS設定から戻ってきた時のハンドリング
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && waitingForReturn.current) {
        waitingForReturn.current = false;
        (async () => {
          await SecureStore.setItemAsync("permissions_done", "true");
          router.replace("/(tabs)");
        })();
      }
    });
    return () => sub.remove();
  }, [router]);

  const handleAllow = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();

    if (fg.status === "granted") {
      await Location.requestBackgroundPermissionsAsync();
    }

    // OS設定に飛んだ場合はAppStateで検知して遷移する
    if (AppState.currentState === "active") {
      await SecureStore.setItemAsync("permissions_done", "true");
      router.replace("/(tabs)");
    } else {
      waitingForReturn.current = true;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>位置情報を許可してください</Text>
        <Text style={styles.description}>
          すれちがいを検出するために{"\n"}
          位置情報の許可が必要です{"\n\n"}
          位置情報は約500mのエリアに{"\n"}
          丸めて表示されるので{"\n"}
          正確な場所は他の人に見えません
        </Text>

        <Image
          source={require("../assets/location-illustration.png")}
          style={styles.illustration}
          resizeMode="contain"
        />

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            「常に許可」を選ぶと{"\n"}
            アプリを閉じていても{"\n"}
            すれちがいを検出できます
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={handleAllow}>
          <Text style={styles.buttonText}>位置情報を許可する</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            await SecureStore.setItemAsync("permissions_done", "true");
            router.replace("/(tabs)");
          }}
        >
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
    width: 220,
    height: 220,
    marginTop: 20,
  },
  tipBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  tipText: {
    fontSize: 14,
    color: "#E8734A",
    textAlign: "center",
    lineHeight: 22,
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
