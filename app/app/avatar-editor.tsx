import { useRef } from "react";
import { StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { updateProfile, SERVER_BASE } from "@/lib/api";
import { useAppStore } from "@/store";

const AVATAR_URL = `${SERVER_BASE}/svgavatars.html`;

export default function AvatarEditorScreen() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const webviewRef = useRef<WebView>(null);

  const handleMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "avatar_saved" && data.url) {
        const fullUrl = `${SERVER_BASE}${data.url}`;

        await updateProfile({ avatar_url: fullUrl });
        setProfile({ avatarUrl: fullUrl });
        Alert.alert("アバターを保存しました", "", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      console.error("アバター保存エラー:", e);
      Alert.alert("エラー", "アバターの保存に失敗しました");
    }
  };

  // フッターメニュー(保存ボタン)を画面下部に固定表示
  const injectedJS = `
    (function() {
      var style = document.createElement('style');
      style.textContent = \`
        #svga-footermenu {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          background: #fff !important;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
          margin-top: 0 !important;
        }
        #svga-container {
          padding-bottom: 70px !important;
        }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: AVATAR_URL }}
      style={styles.container}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
      originWhitelist={["*"]}
      injectedJavaScript={injectedJS}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
