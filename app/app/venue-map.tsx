import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Stack } from "expo-router";
import { WebView } from "react-native-webview";
import { getVenueMapPdfUrl, getVenueMapWebViewUri } from "@/lib/venueMap";

export default function VenueMapScreen() {
  const pdfUrl = getVenueMapPdfUrl();
  const webUri = getVenueMapWebViewUri();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "会場マップ", headerBackTitle: "戻る" }} />
      <WebView
        source={{ uri: webUri }}
        style={styles.webview}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
      />
      <View style={styles.toolbar}>
        <Pressable
          style={styles.toolbarBtn}
          onPress={() => Linking.openURL(pdfUrl).catch(() => {})}
        >
          <Text style={styles.toolbarBtnText}>ブラウザ / PDFアプリで開く</Text>
        </Pressable>
      </View>
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
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF9F2",
  },
  toolbarBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E8734A",
  },
  toolbarBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
