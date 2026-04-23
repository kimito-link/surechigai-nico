import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { subscribeLiveMapEvents, recentLiveMapEvents, type LiveMapEvent } from "@/lib/liveMapBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VENUE = { lat: 35.64831, lng: 140.03459 };
/** 幕張会場を含むおおまかなバウンディングボックス半径 [degree]。5km 相当で過剰フィルタリングを回避 */
const BOX_DEG = 0.08;

function withinVenue(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - VENUE.lat) <= BOX_DEG &&
    Math.abs(lng - VENUE.lng) <= BOX_DEG
  );
}

function encodeSse(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

/**
 * Server-Sent Events で会場周辺の位置更新をリアルタイム配信する。
 *
 * - /api/locations への POST が成功するたびに `publishLiveMapEvent()` を経由してここに届く。
 * - 接続時に `recentLiveMapEvents()` の直近イベントを "catchup" として送信し、
 *   フロントが空から再描画せず済むようにする。
 * - クライアント起動時に URL クエリで `?since=<ms>` を付ければ差分だけ受け取れる。
 */
export async function GET(req: NextRequest) {
  // 任意認証（未ログインでも公開モードで受信させる。認証できればユーザーID付きイベントも届く）
  await authenticateRequest(req);

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      // heartbeat と unsubscribe は close() 内から解放したいため let で前置き宣言。
      // enqueue が throw したとき（下流切断）にも close() を呼べるようにするため、
      // close の定義は safeEnqueue より前にする（TDZ 回避兼 可読性）。
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch {
            /* ignore */
          }
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // enqueue が throw = 下流が閉じた。req.signal の abort が来ない
          // ケース（ネットワーク分断等）があり得るので、ここで heartbeat と
          // subscribe を巻き取って完全解放する。leak するとこのプロセス上の
          // EventEmitter リスナー数が上限(1000)に向けて蓄積し、新規接続が
          // サイレントに throttle される。
          close();
        }
      };

      // 初期 catchup: 直近の会場付近イベントを流す
      const catchup = recentLiveMapEvents(since).filter((e) =>
        withinVenue(e.lat, e.lng)
      );
      safeEnqueue(encodeSse("catchup", { events: catchup, serverTs: Date.now() }));

      // 購読
      unsubscribe = subscribeLiveMapEvents((event: LiveMapEvent) => {
        if (!withinVenue(event.lat, event.lng)) return;
        safeEnqueue(encodeSse("location", event));
      });

      // heartbeat (25秒ごと) — プロキシのアイドル切断を防ぐ
      heartbeat = setInterval(() => {
        safeEnqueue(new TextEncoder().encode(`: ping ${Date.now()}\n\n`));
      }, 25_000);

      // クライアント切断時に後始末
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
