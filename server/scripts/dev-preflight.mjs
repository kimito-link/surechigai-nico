/**
 * ローカル開発の前提チェック（.env.local を読み、VOICEVOX / LLM / 任意で Next プロキシを確認）
 * npm run preflight
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

if (fs.existsSync(path.join(root, ".env"))) {
  dotenv.config({ path: path.join(root, ".env") });
}
if (fs.existsSync(path.join(root, ".env.local"))) {
  dotenv.config({ path: path.join(root, ".env.local"), override: true });
}

function flag(name) {
  const v = process.env[name];
  return v != null && String(v).trim() !== "";
}

async function pingUrl(label, url, ms = 4000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message : String(e) };
  }
}

console.log("=== すれちがいライト / 開発 preflight ===\n");

const hasLlm = flag("OLLAMA_BASE_URL") && flag("OLLAMA_MODEL");
const hasOpenRouter = flag("OPENROUTER_API_KEY");

console.log("[LLM / ゆっくり文]");
if (hasLlm) {
  console.log("  ✓ Ollama 系: OLLAMA_BASE_URL + OLLAMA_MODEL");
} else {
  console.log("  … Ollama 未設定（OLLAMA_BASE_URL / OLLAMA_MODEL）");
}
if (hasOpenRouter) {
  console.log("  ✓ OpenRouter: OPENROUTER_API_KEY");
} else {
  console.log("  … OpenRouter 未設定");
}
if (!hasLlm && !hasOpenRouter) {
  console.log("  ⚠ どちらも無いと /api/yukkuri-explain は 500 になります\n");
} else {
  console.log("");
}

const vxBase = process.env.VOICEVOX_BASE_URL?.trim();
console.log("[VOICEVOX]");
if (!vxBase) {
  console.log("  … VOICEVOX_BASE_URL 未設定 → 本番では読み上げ UI は出ません");
} else {
  console.log(`  参照先: ${vxBase}`);
  const v = await pingUrl("engine", `${vxBase.replace(/\/$/, "")}/version`);
  if (v.ok) {
    console.log("  ✓ エンジン /version に応答あり");
  } else if (v.err) {
    console.log(`  ⚠ エンジンに届かない: ${v.err}`);
    console.log("     → VOICEVOX アプリを起動し、ポートが 50021 か確認してください");
  } else {
    console.log(`  ⚠ HTTP ${v.status}`);
  }
}
console.log("");

const nextBase = (process.env.YUKKURI_BASE || "http://127.0.0.1:3010").replace(/\/$/, "");
console.log(`[Next プロキシ（任意・サーバー起動中なら）] ${nextBase}`);
try {
  const r = await fetch(`${nextBase}/api/voicevox/synthesize`, {
    signal: AbortSignal.timeout(8000),
  });
  const txt = await r.text();
  if (r.ok) {
    try {
      const j = JSON.parse(txt);
      console.log("  GET /api/voicevox/synthesize:", JSON.stringify(j));
    } catch {
      console.log("  ⚠ HTTP 200 だが JSON 以外:", txt.slice(0, 120));
    }
  } else {
    console.log(`  ⚠ HTTP ${r.status}（このプロジェクトの next dev なら通常 200）`);
    if (r.status === 500 || r.status === 404) {
      console.log("     → ポートが別アプリを掴んでいる可能性があります。");
      console.log("        npm run dev:3011 で別ポート起動、または YUKKURI_BASE=http://127.0.0.1:3011 npm run preflight");
      console.log("        PowerShell 例: Get-NetTCPConnection -LocalPort 3010 | Select-Object OwningProcess");
    } else {
      console.log("     → npm run dev 実行後に再試行してください");
    }
  }
} catch (e) {
  console.log(
    "  … 接続できません（dev 未起動）:",
    e instanceof Error ? e.message : e
  );
}
console.log("");

console.log("[Clerk / DB]");
console.log(flag("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && flag("CLERK_SECRET_KEY") ? "  ✓ Clerk キーあり" : "  … Clerk 未設定（LP だけなら問題ない場合あり）");
console.log(flag("DB_HOST") && flag("DB_NAME") ? "  ✓ DB 系あり" : "  … DB 未設定（/app や locations で必要）");
console.log("\n完了。問題があれば .env.local を .env.example と照合してください。\n");
