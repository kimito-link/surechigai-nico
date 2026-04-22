/**
 * Windows: VOICEVOX エンジン API を直接起動（http://127.0.0.1:50021）
 * npm run voicevox:launch
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WAIT_MS = 15000;
const RETRY_MS = 500;
const HOST = "127.0.0.1";
const PORT = "50021";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReachable() {
  try {
    const r = await fetch(`http://${HOST}:${PORT}/version`, {
      signal: AbortSignal.timeout(2500),
    });
    return r.ok;
  } catch {
    return false;
  }
}

if (process.platform !== "win32") {
  console.error("このスクリプトは Windows 専用です。");
  process.exit(1);
}

if (await isReachable()) {
  console.log(`既に起動済みです: http://${HOST}:${PORT}`);
  process.exit(0);
}

const local = process.env.LOCALAPPDATA || "";
const pf = process.env.ProgramFiles || "C:\\Program Files";
const pfx86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

const engineDirs = [
  path.join(local, "Programs", "VOICEVOX", "vv-engine"),
  path.join(pf, "VOICEVOX", "vv-engine"),
  path.join(pfx86, "VOICEVOX", "vv-engine"),
];

for (const engineDir of engineDirs) {
  const exe = path.join(engineDir, "run.exe");
  if (!fs.existsSync(exe)) continue;

  const child = spawn(
    exe,
    ["--host", HOST, "--port", PORT, "--output_log_utf8"],
    {
      cwd: engineDir,
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();

  const startedAt = Date.now();
  while (Date.now() - startedAt < WAIT_MS) {
    if (await isReachable()) {
      console.log("VOICEVOX エンジン起動成功:", exe);
      console.log(`接続先: http://${HOST}:${PORT}`);
      process.exit(0);
    }
    await sleep(RETRY_MS);
  }

  console.warn(`起動試行したが応答なし: ${exe}`);
}

console.error("VOICEVOX エンジンを起動できませんでした。");
console.error("次を確認してください:");
console.error("  1) VOICEVOX の初回起動セットアップが完了している");
console.error("  2) セキュリティソフトで run.exe がブロックされていない");
console.error("  3) 既存 run.exe を終了してから再実行する");
console.error("探した場所:\n", engineDirs.map((c) => `  - ${c}`).join("\n"));
process.exit(1);
