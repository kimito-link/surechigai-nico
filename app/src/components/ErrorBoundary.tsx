import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>エラーが発生しました</Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>
              {this.state.error?.message || "不明なエラー"}
            </Text>
            <Text style={styles.stackText}>
              {this.state.error?.stack?.slice(0, 500)}
            </Text>
          </ScrollView>
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>再試行</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF9F2",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
    marginBottom: 16,
  },
  errorBox: {
    maxHeight: 300,
    backgroundColor: "#FFF4E8",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  stackText: {
    fontSize: 11,
    color: "#999",
  },
  button: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
