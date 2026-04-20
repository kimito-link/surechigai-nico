import { createContext, useContext } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLocation, type LocationPermissionStatus } from "@/hooks/useLocation";
import { useAppStore } from "@/store";
import { Avatar } from "@/components/Avatar";

interface LocationContextType {
  permissionStatus: LocationPermissionStatus;
  openSettings: () => void;
}

export const LocationContext = createContext<LocationContextType>({
  permissionStatus: "loading",
  openSettings: () => {},
});

export function useLocationContext() {
  return useContext(LocationContext);
}

export default function TabLayout() {
  const { permissionStatus, openSettings } = useLocation();
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const nickname = useAppStore((s) => s.nickname);

  return (
    <LocationContext.Provider value={{ permissionStatus, openSettings }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#E8734A",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            backgroundColor: "#FFF9F2",
            borderTopColor: "#EEE",
          },
          headerStyle: { backgroundColor: "#FFF9F2" },
          headerTintColor: "#333",
          freezeOnBlur: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "ホーム",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ghost"
          options={{
            title: "おさんぽ",
            tabBarIcon: ({ color, size }) => (
              avatarUrl ? (
                <View style={{ borderWidth: 2, borderColor: color, borderRadius: (size + 2) / 2, padding: 1 }}>
                  <Avatar url={avatarUrl} nickname={nickname} size={size - 2} />
                </View>
              ) : (
                <Ionicons name="person-outline" size={size} color={color} />
              )
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "統計",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="badges"
          options={{
            title: "コレクション",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "設定",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </LocationContext.Provider>
  );
}
