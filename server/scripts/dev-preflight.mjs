/**
 * ローカル開発の前提チェック（.env.local を読み、LLM / 任意で Next プロキシを確認）
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

console.log("[Clerk / DB]");
console.log(flag("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && flag("CLERK_SECRET_KEY") ? "  ✓ Clerk キーあり" : "  … Clerk 未設定（LP だけなら問題ない場合あり）");
console.log(flag("DB_HOST") && flag("DB_NAME") ? "  ✓ DB 系あり" : "  … DB 未設定（/app や locations で必要）");
console.log("\n完了。問題があれば .env.local を .env.example と照合してください。\n");
