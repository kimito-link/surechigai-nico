/**
 * ライブマップ用の簡易 Pub/Sub バス。
 *
 * 優先順位:
 *  1. Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`)
 *     - サーバーレス環境で複数インスタンスをまたぐ場合のみ Upstash で publish する。
 *     - ただし REST なので subscribe は直接できない。購読は都度 `recentEvents()` を
 *       使ったポーリング風の読み出しで十分（超会議ユースケースでは秒単位で足りる）。
 *  2. Node.js EventEmitter（インプロセス fallback）
 *     - 単一インスタンス or 開発環境。SSE ルートはこちらで十分機能する。
 *
 * publishLiveMapEvent() は両方に書き込む（upstash が失敗しても in-process には必ず流す）。
 */

import { EventEmitter } from "node:events";

export type LiveMapEvent = {
  type: "location";
  userId: number;
  lat: number;
  lng: number;
  h3: string;
  ts: number;
};

type GlobalBusStore = {
  emitter: EventEmitter;
  ring: LiveMapEvent[]; // 最近 N 件（Upstash が無い環境用のクライアント "catch-up"）
};

const globalKey = "__surechigai_live_map_bus__";

function getStore(): GlobalBusStore {
  const g = globalThis as unknown as Record<string, GlobalBusStore | undefined>;
  if (!g[globalKey]) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(1000);
    g[globalKey] = { emitter, ring: [] };
  }
  return g[globalKey] as GlobalBusStore;
}

const RING_MAX = 200;

let upstashClientPromise: Promise<unknown | null> | null = null;
async function getUpstashClient(): Promise<unknown | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!upstashClientPromise) {
    upstashClientPromise = import("@upstash/redis")
      .then((mod) => {
        return new mod.Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
      })
      .catch((err) => {
        console.warn("[liveMapBus] Upstash init failed", err);
        return null;
      });
  }
  return upstashClientPromise;
}

/** イベントを発行する（永続化しない、揮発メッセージ） */
export function publishLiveMapEvent(payload: Omit<LiveMapEvent, "type">) {
  const event: LiveMapEvent = { type: "location", ...payload };
  const store = getStore();
  store.ring.push(event);
  if (store.ring.length > RING_MAX) store.ring.shift();
  try {
    store.emitter.emit("event", event);
  } catch (err) {
    console.warn("[liveMapBus] emit failed", err);
  }

  // Upstash への publish は fire-and-forget（応答を待たない）
  void (async () => {
    try {
      const client = await getUpstashClient();
      if (!client) return;
      // @ts-expect-error Upstash Redis client signature (dynamic import)
      await client.publish("surechigai:live-map", JSON.stringify(event));
    } catch (err) {
      console.warn("[liveMapBus] upstash publish failed", err);
    }
  })();
}

/** 購読: 取得したイベントごとにコールバックが呼ばれる。cleanup 関数を返す。
 *
 * 安全策: `onEvent` が throw した場合、Node の EventEmitter はデフォルトで
 * 'error' イベントを発火し、error listener が無いとプロセス自体が落ちる。
 * 会期中に 1 つの壊れた SSE 接続がサーバ全体を落とすのは致命的なので、
 * このレイヤでコールバックを try/catch で囲んで隔離する。
 *
 * 典型的な例外源: live-stream route が `JSON.stringify(event)` で投げる
 * （循環参照は現状無いが、将来 event 型を拡張したときのリスクを抑える）、
 * または `controller.enqueue` の内部例外がここまで漏れたケース。
 */
export function subscribeLiveMapEvents(
  onEvent: (event: LiveMapEvent) => void
): () => void {
  const store = getStore();
  const safe = (event: LiveMapEvent) => {
    try {
      onEvent(event);
    } catch (err) {
      console.warn("[liveMapBus] listener threw (isolated)", err);
    }
  };
  store.emitter.on("event", safe);
  return () => {
    store.emitter.off("event", safe);
  };
}

/** 新規接続時に "catch-up" として直近イベントを返す。 */
export function recentLiveMapEvents(sinceMs?: number): LiveMapEvent[] {
  const store = getStore();
  if (typeof sinceMs !== "number" || !Number.isFinite(sinceMs)) {
    return [...store.ring];
  }
  return store.ring.filter((e) => e.ts >= sinceMs);
}
