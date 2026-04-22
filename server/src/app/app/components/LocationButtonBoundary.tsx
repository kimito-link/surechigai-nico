"use client";

import { Component, type ReactNode } from "react";
import styles from "../app.module.css";

type Props = { children: ReactNode };
type State = { hasError: boolean; errorMessage: string | null };

export default class LocationButtonBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== "undefined") {
      console.error("[LocationButtonBoundary] widget crashed:", error);
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.card} role="alert">
          <h3 className={styles.cardTitle}>位置共有ウィジェット</h3>
          <p className={styles.cardDescription}>
            位置共有ウィジェットでエラーが発生しました。ページを再読み込みしてください。
          </p>
          {this.state.errorMessage && (
            <p className={styles.errorMessage}>
              詳細: {this.state.errorMessage}
            </p>
          )}
          <button
            type="button"
            className={styles.button}
            onClick={this.handleReload}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
