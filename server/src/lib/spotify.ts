let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify API の認証情報が設定されていません");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify トークン取得失敗: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artistName: string;
  albumImageUrl: string;
  spotifyUrl: string;
}

export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=JP&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Spotify 検索失敗: ${res.status}`);
  }

  const data = await res.json();

  return data.tracks.items.map((track: Record<string, unknown>) => ({
    id: track.id,
    name: track.name,
    artistName: (track.artists as Array<{ name: string }>)[0]?.name || "",
    albumImageUrl: (track.album as { images: Array<{ url: string }> }).images?.[1]?.url || "",
    spotifyUrl: (track.external_urls as { spotify: string })?.spotify || "",
  }));
}
