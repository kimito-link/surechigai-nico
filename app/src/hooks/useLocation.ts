import { useEffect, useRef, useState, useCallback } from "react";
import * as Location from "expo-location";
import { Linking, AppState } from "react-native";
import Constants from "expo-constants";
import { sendLocation } from "../lib/api";

export type LocationPermissionStatus =
  | "loading"
  | "granted"
  | "foreground_only"
  | "denied"
  | "undetermined";

const isExpoGo = Constants.appOwnership === "expo";

async function checkPermissionStatus(): Promise<LocationPermissionStatus> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status === "undetermined") return "undetermined";
    if (fg.status !== "granted") return "denied";

    // Expo Goではバックグラウンド権限チェックがクラッシュする場合があるのでtry-catch
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (bg.status !== "granted") return "foreground_only";
    } catch {
      // Expo Goでバックグラウンド権限チェックに失敗した場合はgrantedとみなす
      if (isExpoGo) return "granted";
      return "foreground_only";
    }

    return "granted";
  } catch {
    return "denied";
  }
}

async function startBackgroundTask() {
  if (isExpoGo) return;

  try {
    const TaskManager = await import("expo-task-manager");
    const TASK_NAME = "surechigai-background-location";

    const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (isRunning) return;

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 500,
      deferredUpdatesInterval: 5 * 60 * 1000,
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.OtherNavigation,
    });
  } catch (e) {
    console.error("バックグラウンドタスク開始エラー:", e);
  }
}

export function useLocation() {
  const initialized = useRef(false);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>("loading");

  // 権限の確認のみ（ダイアログは permission-location.tsx で出す）
  const checkAndStart = useCallback(async () => {
    try {
      const status = await checkPermissionStatus();
      setPermissionStatus(status);

      if (status === "granted" || status === "foreground_only") {
        if (status === "granted") {
          await startBackgroundTask();
        }

        // フォアグラウンドで一回送信
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await sendLocation(loc.coords.latitude, loc.coords.longitude);
        } catch (e) {
          console.error("初期位置送信エラー:", e);
        }
      }
    } catch (e) {
      console.error("権限チェックエラー:", e);
      setPermissionStatus("denied");
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    checkAndStart();
  }, [checkAndStart]);

  // アプリがフォアグラウンドに戻った時に再チェック
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAndStart();
      }
    });
    return () => sub.remove();
  }, [checkAndStart]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const sendCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await sendLocation(location.coords.latitude, location.coords.longitude);
      return location;
    } catch (e) {
      console.error("現在地取得失敗:", e);
      return null;
    }
  };

  return { permissionStatus, sendCurrentLocation, openSettings };
}
