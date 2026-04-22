# VOICEVOX 起動エラー対処（Windows）

最終更新: 2026-04-22

## 症状

- `VOICEVOX.exe - アプリケーション エラー`
- `0x80000003` / `0x00007FFD...` などの例外ダイアログ

このエラーは GUI アプリ（`VOICEVOX.exe`）側で起きることがあります。  
本プロジェクトで必要なのは API エンジン（`vv-engine/run.exe`）です。

## 正しい起動手順

```powershell
cd surechigai-lite-handoff/server
npm run voicevox:launch
npm run voicevox:status
```

`voicevox:status` が `reachable: true` なら利用可能です。

## NG 手順

- `VOICEVOX.exe` を手動起動して Web API 代わりに使う

GUI が落ちても `vv-engine/run.exe` が動いていれば Web 側は問題ありません。

## 確認コマンド

```powershell
npm run preflight
```

`[VOICEVOX]` セクションで `/version` 応答が `✓` なら OK。

