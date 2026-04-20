/**
 * 立ち絵アニメ用 CSS（layout のグローバル import に頼らず、YukkuriDialogue 内の <style> で注入）
 */
export const YUKKURI_AVATAR_MOTION_CSS = `
@keyframes yukkuriChokaigiRink {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(0, -12px, 0) rotate(2.5deg); }
}
@keyframes yukkuriChokaigiKonta {
  0%, 100% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(0, -14px, 0); }
  50% { transform: translate3d(0, -5px, 0); }
  75% { transform: translate3d(0, -11px, 0); }
}
@keyframes yukkuriChokaigiTanunee {
  0%, 100% { transform: translate3d(0, 0, 0); }
  33% { transform: translate3d(5px, -10px, 0); }
  66% { transform: translate3d(-5px, -6px, 0); }
}
.yukkuri-chokaigi-mot--rink {
  animation: yukkuriChokaigiRink 3.2s ease-in-out infinite;
  transform-origin: 50% 85%;
}
.yukkuri-chokaigi-mot--konta {
  animation: yukkuriChokaigiKonta 2.5s ease-in-out infinite;
  transform-origin: 50% 85%;
}
.yukkuri-chokaigi-mot--tanunee {
  animation: yukkuriChokaigiTanunee 3.6s ease-in-out infinite;
  transform-origin: 50% 85%;
}
@media (prefers-reduced-motion: reduce) {
  .yukkuri-chokaigi-mot--rink,
  .yukkuri-chokaigi-mot--konta,
  .yukkuri-chokaigi-mot--tanunee {
    animation: none !important;
  }
}
`.trim();
