# TODO: クリエイタークロス Xアカウント拡充

- [x] 公式出展データ（`creatorcross-official-data.ts`）の現状件数とXリンク不足件数を確認
- [x] 候補自動生成スクリプト `scripts/generate-creatorcross-x-candidates.mjs` を追加
- [x] 長時間実行向けに分割実行（`--start` / `--limit`）と進捗保存を追加
- [ ] 候補生成を全範囲で実行して `creatorcross-x-candidates.ts` を完成させる
- [ ] `CreatorCrossSearch.tsx` に候補アカウント読み込み・表示を追加
- [ ] 検索サジェストに候補アカウント（`@handle`）を統合
- [ ] 明らかな誤候補（汎用公式アカウント等）を除外する最終クリーニング
- [ ] `npm run build` で型・ビルド確認
- [ ] 変更をコミット＆プッシュ

