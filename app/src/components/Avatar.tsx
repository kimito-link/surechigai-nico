import { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface Props {
  url?: string | null;
  nickname?: string;
  size?: number;
}

export function Avatar({ url, nickname, size = 44 }: Props) {
  const borderRadius = size / 2;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // urlが変わったらリセット
  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
  }, [url]);

  // 画像読み込みのタイムアウト(3秒)
  useEffect(() => {
    if (!url || loadError || loaded) return;
    const timer = setTimeout(() => {
      if (!loaded) setLoadError(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [url, loaded, loadError]);

  const showImage = url && url.length > 0 && !loadError;

  return (
    <View style={{ width: size, height: size }}>
      {showImage && (
        <Image
          source={{ uri: url }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
          onLoad={() => setLoaded(true)}
          onError={() => setLoadError(true)}
        />
      )}
      {(!showImage || !loaded) && (
        <View style={[styles.fallback, { width: size, height: size, borderRadius, position: showImage ? "absolute" : "relative" }]}>
          <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
            {nickname?.charAt(0) || "匿"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#E8E8E8",
  },
  fallback: {
    backgroundColor: "#E8734A",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
