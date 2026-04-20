import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "@/lib/backgroundLocation"; // バックグラウンドタスク登録（dev buildのみ）

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FFF9F2" },
          headerTintColor: "#333",
          headerTitleStyle: { fontWeight: "600" },
          freezeOnBlur: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile-setup"
          options={{ title: "プロフィール設定", headerBackVisible: false }}
        />
        <Stack.Screen name="permission-notification" options={{ headerShown: false }} />
        <Stack.Screen name="permission-location" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="encounter/[id]"
          options={{ title: "すれちがい詳細", headerBackTitle: "ホーム" }}
        />
        <Stack.Screen name="song-search" options={{ title: "曲を検索", presentation: "modal" }} />
        <Stack.Screen name="avatar-editor" options={{ title: "アバター作成", presentation: "modal" }} />
        <Stack.Screen name="venue-map" options={{ title: "会場マップ" }} />
      </Stack>
    </ErrorBoundary>
  );
}
