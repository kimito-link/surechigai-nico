"use client";

import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";

type Props = { rink: string; konta: string; tanunee: string };

/** シェア用 URL パラメータから VOICEVOX 再生 */
export function YukkuriShareVoice({ rink, konta, tanunee }: Props) {
  if (!rink && !konta && !tanunee) return null;
  return (
    <YukkuriVoicePlayer
      dialogue={{ rink: rink || "", konta: konta || "", tanunee: tanunee || "" }}
      compact
    />
  );
}
