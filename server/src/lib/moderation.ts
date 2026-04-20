// NGワードフィルター
// 基本的な不適切ワードのリスト（運用で追加していく）
const NG_WORDS = [
  "死ね", "殺す", "殺してやる",
  "ばか", "あほ", "くそ",
  "セックス", "エッチ",
  "LINE交換", "LINE教えて",
  "会いたい", "会おう",
  "電話番号", "住所教えて",
];

// 正規表現でマッチ（部分一致）
const ngRegex = new RegExp(NG_WORDS.map(w => escapeRegExp(w)).join("|"), "i");

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsNgWord(text: string): boolean {
  return ngRegex.test(text);
}

export function filterNgWords(text: string): string {
  return text.replace(ngRegex, (match) => "＊".repeat(match.length));
}
