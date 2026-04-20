import { Platform, View, Text, Pressable, StyleSheet } from "react-native";
import type { LocationPermissionStatus } from "@/hooks/useLocation";

interface Props {
  status: LocationPermissionStatus;
  onPress: () => void;
}

interface Message {
  title: string;
  description: string;
  steps: string;
  buttonText: string;
}

function getDeniedMessage(): Message {
  if (Platform.OS === "ios") {
    return {
      title: "位置情報がオフです",
      description: "すれちがい検出には位置情報の許可が必要です",
      steps: "設定 → プライバシーとセキュリティ → 位置情報サービス → すれちがいライト →「常に」を選択",
      buttonText: "設定を開く",
    };
  }
  return {
    title: "位置情報がオフです",
    description: "すれちがい検出には位置情報の許可が必要です",
    steps: "設定 → アプリ → すれちがいライト → 権限 → 位置情報 →「常に許可」を選択",
    buttonText: "設定を開く",
  };
}

function getForegroundOnlyMessage(): Message {
  if (Platform.OS === "ios") {
    return {
      title: "📍「常に許可」に変更してください",
      description: "バックグラウンドでのすれちがい検出には「常に」が必要です",
      steps: "設定 → プライバシーとセキュリティ → 位置情報サービス → すれちがいライト →「常に」を選択",
      buttonText: "設定を開く",
    };
  }
  return {
    title: "📍「常に許可」に変更してください",
    description: "バックグラウンドでのすれちがい検出には「常に許可」が必要です",
    steps: "設定 → アプリ → すれちがいライト → 権限 → 位置情報 →「常に許可」を選択",
    buttonText: "設定を開く",
  };
}

export function LocationPermissionBanner({ status, onPress }: Props) {
  let message: Message | null = null;

  if (status === "denied") {
    message = getDeniedMessage();
  } else if (status === "foreground_only") {
    message = getForegroundOnlyMessage();
  }

  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>
      <View style={styles.stepsBox}>
        <Text style={styles.stepsText}>{message.steps}</Text>
      </View>
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>{message.buttonText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E65100",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#BF360C",
    lineHeight: 20,
    marginBottom: 8,
  },
  stepsBox: {
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  stepsText: {
    fontSize: 12,
    color: "#795548",
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#FF9800",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
