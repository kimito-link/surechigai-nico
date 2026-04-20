import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function SplashScreen() {
  const router = useRouter();
  const { authState } = useAuth();

  useEffect(() => {
    if (authState === "loading") return;

    const timer = setTimeout(() => {
      switch (authState) {
        case "onboarding":
          router.replace("/onboarding");
          break;
        case "profile-setup":
          router.replace("/profile-setup");
          break;
        case "permissions":
          router.replace("/permission-notification");
          break;
        case "ready":
          router.replace("/(tabs)");
          break;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [authState, router]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <View style={styles.logoCircle} />
      </View>
      <ActivityIndicator size="large" color="#E8734A" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
  },
  logo: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8734A",
  },
  spinner: {
    marginTop: 20,
  },
});
