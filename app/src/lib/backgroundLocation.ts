import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { sendLocation } from "./api";
import { getUuid } from "./storage";
import Constants from "expo-constants";

const LOCATION_TASK_NAME = "surechigai-background-location";

// Expo GoではTaskManagerが使えないので登録しない
if (Constants.appOwnership !== "expo") {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error("バックグラウンド位置情報エラー:", error);
      return;
    }

    const locations = (data as { locations: Location.LocationObject[] }).locations;
    if (!locations || locations.length === 0) return;

    const uuid = await getUuid();
    if (!uuid) return;

    const latest = locations[locations.length - 1];
    try {
      await sendLocation(latest.coords.latitude, latest.coords.longitude);
    } catch (e) {
      console.error("位置送信失敗:", e);
    }
  });
}
