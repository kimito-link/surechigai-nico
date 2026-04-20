import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { WebView } from "react-native-webview";
import { SERVER_BASE } from "@/lib/api";

export default function WebViewPage() {
  const { path, title } = useLocalSearchParams<{ path: string; title: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title || "", headerBackTitle: "戻る" }} />
      <WebView
        source={{ uri: `${SERVER_BASE}/${path}` }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  webview: {
    flex: 1,
  },
});
