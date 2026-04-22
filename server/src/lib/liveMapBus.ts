// SSE ブロードキャスト用スタブ（未実装）
export function publishLiveMapEvent(_event: {
  userId: number;
  lat: number;
  lng: number;
  h3: string | null;
  ts: number;
}): void {
  // 将来的に SSE 購読者へブロードキャスト予定
}
