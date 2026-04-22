/**
 * 逆ジオコーディング（緯度経度 → エリア名）
 * OpenStreetMap Nominatim API を使用
 * レートリミット: 1リクエスト/秒
 */

let lastRequestTime = 0;

async function throttle() {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - diff));
  }
  lastRequestTime = Date.now();
}

/**
 * 緯度経度からエリア名+都道府県を一括取得(API呼び出し1回)
 */
export async function reverseGeocodeWithPrefecture(lat: number, lng: number): Promise<{ area: string; prefecture: string | null }> {
  try {
    await throttle();

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&accept-language=ja`,
      {
        headers: {
          "User-Agent": "surechigai-app/0.1.0",
        },
      }
    );

    if (!res.ok) return { area: "不明なエリア", prefecture: null };

    const data = await res.json();
    const addr = data.address;

    // 都道府県
    const prefecture = (addr.state as string) || null;

    // エリア名(既存ロジックと同じ)
    const town = addr.suburb || addr.neighbourhood || addr.quarter || null;
    const district = addr.city_district || addr.city || addr.town || null;
    if (!town && !district) return { area: "不明なエリア", prefecture };
    const cleanTown = town?.replace(/[一二三四五六七八九十\d]+丁目$/, "") || null;
    const area = cleanTown && district
      ? `${cleanTown}(${district})`
      : (cleanTown || district) + "エリア";

    return { area, prefecture };
  } catch (e) {
    console.error("逆ジオコーディングエラー:", e);
    return { area: "不明なエリア", prefecture: null };
  }
}

export async function reverseGeocodeToMunicipality(lat: number, lng: number): Promise<string | null> {
  try {
    await throttle();

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&accept-language=ja`,
      {
        headers: {
          "User-Agent": "surechigai-app/0.1.0",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address;

    // Nominatimの返り値パターン:
    // 東京23区: city="渋谷区" (cityに区名が直接入る)
    // 政令指定都市: city="札幌市", suburb="中央区"
    // 一般市: city="前橋市"
    // 町村: town="○○町" or village="○○村"
    const city = addr.city as string | undefined;
    const suburb = addr.suburb as string | undefined;
    const town = addr.town as string | undefined;
    const village = addr.village as string | undefined;

    // 東京23区: cityが"○○区"の形式
    if (city && city.endsWith("区") && !city.includes("市")) {
      return city;
    }
    // 政令指定都市: city="札幌市" + suburb="中央区" → "札幌市中央区"
    if (city && city.endsWith("市") && suburb && suburb.endsWith("区")) {
      return `${city}${suburb}`;
    }
    // 一般市
    if (city) return city;
    // 町村
    if (town) return town;
    if (village) return village;

    return null;
  } catch (e) {
    console.error("市区町村逆ジオコーディングエラー:", e);
    return null;
  }
}
