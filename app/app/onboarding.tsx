import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { setOnboardingDone } from "@/lib/storage";

const SLIDES = [
  {
    type: "image" as const,
    image: require("../assets/onboarding-1.png"),
  },
  {
    type: "image" as const,
    image: require("../assets/onboarding-2.png"),
  },
  {
    type: "image" as const,
    image: require("../assets/onboarding-3.png"),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const insets = useSafeAreaInsets();

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await setOnboardingDone();
      router.replace("/profile-setup");
    }
  };

  const slide = SLIDES[currentSlide];

  if (slide.type === "image") {
    return (
      <View style={[styles.imageContainer, { paddingTop: insets.top }]}>
        <Image
          source={slide.image}
          style={styles.slideImage}
          resizeMode="contain"
        />
        <View style={styles.imageFooter}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentSlide && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>次へ</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide < SLIDES.length - 1 ? "次へ" : "はじめる"}
          </Text>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  slideImage: {
    flex: 1,
    width: Dimensions.get("window").width,
  },
  imageFooter: {
    alignItems: "center",
    paddingBottom: 60,
    paddingTop: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    justifyContent: "space-between",
    paddingTop: 100,
    paddingBottom: 60,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
  },
  footer: {
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#E8734A",
    width: 24,
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
});
