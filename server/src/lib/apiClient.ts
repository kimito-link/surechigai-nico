import { createAuthHeader } from "./clientAuth";

/**
 * UUID トークンをヘッダーに付与してAPI呼び出しを実行
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const authHeader = createAuthHeader();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      ...authHeader,
    },
  });
}

/**
 * JSON レスポンスを パース
 */
export async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  return response.json() as Promise<T>;
}
