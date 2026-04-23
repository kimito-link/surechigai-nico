/** 画面上・API・DB に保存する1人あたりの上限（読み応えとレイアウトの兼ね合い） */
export const YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER = 118;

/** XシェアOG画像の1行プレビュー（省略は画像側のみ。本文はページで全文表示可） */
export const YUKKURI_DIALOGUE_OG_PREVIEW_CHARS = 45;

export type YukkuriDialogueTriplet = {
  rink: string;
  konta: string;
  tanunee: string;
};

export function clampYukkuriSpeakerLine(
  text: string,
  maxChars: number = YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return text.trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}…`;
}

export function clampYukkuriDialogue(dialogue: YukkuriDialogueTriplet): YukkuriDialogueTriplet {
  const max = YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER;
  return {
    rink: clampYukkuriSpeakerLine(dialogue.rink, max),
    konta: clampYukkuriSpeakerLine(dialogue.konta, max),
    tanunee: clampYukkuriSpeakerLine(dialogue.tanunee, max),
  };
}
