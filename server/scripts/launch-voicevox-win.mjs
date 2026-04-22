/**
 * Windows: よくあるインストール先から VOICEVOX を起動（既に起動済みなら二重起動になる場合あり）
 * npm run voicevox:launch
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

if (process.platform !== "win32") {
  console.error("このスクリプトは Windows 専用です。macOS/Linux はアプリから手動起動してください。");
  process.exit(1);
}

const local = process.env.LOCALAPPDATA || "";
const pf = process.env.ProgramFiles || "C:\\Program Files";
const pfx86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

const candidates = [
  path.join(local, "Programs", "VOICEVOX", "VOICEVOX.exe"),
  path.join(pf, "VOICEVOX", "VOICEVOX.exe"),
  path.join(pfx86, "VOICEVOX", "VOICEVOX.exe"),
];

for (const exe of candidates) {
  if (fs.existsSync(exe)) {
    const child = spawn(exe, [], { detached: true, stdio: "ignore" });
    child.unref();
    console.log("起動しました:", exe);
    console.log("数秒待ってから: npm run preflight");
    process.exit(0);
  }
}

console.error("VOICEVOX.exe が見つかりませんでした。スタートメニューから「VOICEVOX」を起動してください。");
console.error("探した場所:\n", candidates.map((c) => "  - " + c).join("\n"));
process.exit(1);
