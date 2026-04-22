/** LocationButton / VenueLiveMap 共通（投影・地図URL・表示用） */

export type LiveMapUser = {
  id: number;
  nickname: string;
  twitterHandle: string | null;
  lat: number;
  lng: number;
  municipality: string | null;
  updatedAtMs: number;
  isMe: boolean;
};

export type LiveMapPayload = {
  venue: {
    name: string;
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  note: string;
  users: LiveMapUser[];
  generatedAtMs: number;
  /** 会場マップ（chokaigi）のみ API が返す場合あり */
  publicMode?: boolean;
};

export type MapPoint = LiveMapUser & {
  leftPct: number;
  topPct: number;
};

export const LIVE_MAP_WIDTH = 640;
export const LIVE_MAP_HEIGHT = 420;
export const LIVE_MAP_ZOOM = 15;
/** ライブマップ API のポーリング間隔（ms） */
export const LIVE_MAP_POLL_MS = 15_000;

export const LIVE_MAP_FALLBACK_VENUE = {
  name: "幕張メッセ（ニコニコ超会議）",
  lat: 35.64831,
  lng: 140.03459,
};

export function liveMapToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function liveMapToMapPoint(
  user: LiveMapUser,
  venue: { lat: number; lng: number },
  zoom: number,
  mapWidth = LIVE_MAP_WIDTH,
  mapHeight = LIVE_MAP_HEIGHT
): MapPoint | null {
  const venuePixel = liveMapToWorldPixel(venue.lat, venue.lng, zoom);
  const userPixel = liveMapToWorldPixel(user.lat, user.lng, zoom);

  const px = mapWidth / 2 + (userPixel.x - venuePixel.x);
  const py = mapHeight / 2 + (userPixel.y - venuePixel.y);

  if (px < -24 || px > mapWidth + 24 || py < -24 || py > mapHeight + 24) {
    return null;
  }

  const jitterX = user.isMe ? 0 : ((user.id * 13) % 5) - 2;
  const jitterY = user.isMe ? 0 : ((user.id * 7) % 5) - 2;

  const leftPct = ((px + jitterX) / mapWidth) * 100;
  const topPct = ((py + jitterY) / mapHeight) * 100;

  return {
    ...user,
    leftPct,
    topPct,
  };
}

export function liveMapFormatAgo(updatedAtMs: number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
  if (diffSec < 20) return "たった今";
  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  return `${Math.floor(diffSec / 3600)}時間前`;
}

export function liveMapBuildStaticImageUrl(venue: { lat: number; lng: number }) {
  const center = `${venue.lat},${venue.lng}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=${LIVE_MAP_ZOOM}&size=${LIVE_MAP_WIDTH}x${LIVE_MAP_HEIGHT}&maptype=mapnik`;
}

export function liveMapBuildOsmTileImageUrl(lat: number, lng: number, z = 14) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}
