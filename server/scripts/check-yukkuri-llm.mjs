/**
 * GET /api/yukkuri-explain の疎通（Ollama / OpenRouter 設定の目安）
 * 使い方: YUKKURI_BASE=http://localhost:3010 node scripts/check-yukkuri-llm.mjs
 */
const base = (process.env.YUKKURI_BASE || "http://localhost:3010").replace(/\/$/, "");
const url = `${base}/api/yukkuri-explain`;
const res = await fetch(url);
const text = await res.text();
console.log(res.status, url);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
