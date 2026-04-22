"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./MangamuraPranksterLink.module.css";

type Line = {
  who: "rink" | "konta" | "tanunee";
  name: string;
  avatar: string;
  text: ReactNode;
  side: "left" | "right";
};

const LINES: Line[] = [
  {
    who: "rink",
    name: "りんく",
    avatar: "/chokaigi/yukkuri/rink.png",
    text: "あれ…？ もうないみたい…",
    side: "left",
  },
  {
    who: "konta",
    name: "こん太",
    avatar: "/chokaigi/yukkuri/konta.png",
    text: "おいおい！ クリエイター応援サイトだぞ！",
    side: "right",
  },
  {
    who: "tanunee",
    name: "たぬ姉",
    avatar: "/chokaigi/yukkuri/tanunee.png",
    text: "ぜったい見ちゃダメだよー🙅‍♀️",
    side: "left",
  },
  {
    who: "rink",
    name: "りんく",
    avatar: "/chokaigi/yukkuri/rink.png",
    text: (
      <>
        それとね…
        <strong>漫画村は、ぜったいに作っちゃダメだからねー！</strong>🚨
      </>
    ),
    side: "right",
  },
];

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

export default function MangamuraPranksterLink({
  href,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>

      {open && (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label="漫画村リンクのご案内"
          onClick={() => setOpen(false)}
        >
          <div
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeX}
              aria-label="閉じる"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <h3 className={styles.title}>🌸 クリエイター応援サイトのご案内 🌸</h3>
            <div className={styles.script}>
              {LINES.map((line, i) => (
                <div
                  key={i}
                  className={`${styles.row} ${
                    line.side === "right" ? styles.rowReverse : ""
                  }`}
                >
                  <div className={styles.avatarWrap}>
                    <img
                      src={line.avatar}
                      alt={line.name}
                      className={styles.avatar}
                      loading="lazy"
                    />
                    <span className={styles.nameBadge}>{line.name}</span>
                  </div>
                  <div className={styles.bubble}>{line.text}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setOpen(false)}
            >
              わかった、閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
