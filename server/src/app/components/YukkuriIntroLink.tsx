"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./YukkuriIntroLink.module.css";

/** 同一サイト内パス（`//host` などの偽装を除外） */
function isSameOriginAppPath(target: string): boolean {
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false;
  return true;
}

export type YukkuriSpeaker = "rink" | "konta" | "tanunee";

export type YukkuriLine = {
  who: YukkuriSpeaker;
  text: string;
};

const META: Record<
  YukkuriSpeaker,
  { name: string; avatar: string; side: "left" | "right" }
> = {
  rink: {
    name: "りんく",
    avatar: "/chokaigi/yukkuri/rink.png",
    side: "left",
  },
  konta: {
    name: "こん太",
    avatar: "/chokaigi/yukkuri/konta.png",
    side: "right",
  },
  tanunee: {
    name: "たぬ姉",
    avatar: "/chokaigi/yukkuri/tanunee.png",
    side: "left",
  },
};

type Props = {
  href: string;
  /** 同一ページ内の `#` 着地用（例: 機能グリッドの深いリンク） */
  id?: string;
  className?: string;
  children: ReactNode;
  title: string;
  lines: ReadonlyArray<YukkuriLine>;
  ctaLabel: string;
  ctaHref?: string;
};

export default function YukkuriIntroLink({
  href,
  id,
  className,
  children,
  title,
  lines,
  ctaLabel,
  ctaHref,
}: Props) {
  const router = useRouter();
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

  const proceed = () => {
    const target = ctaHref ?? href;
    if (isSameOriginAppPath(target)) {
      setOpen(false);
      router.push(target);
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <a
        id={id}
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
          aria-label={title}
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
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.script}>
              {lines.map((line, i) => {
                const meta = META[line.who];
                return (
                  <div
                    key={i}
                    className={`${styles.row} ${
                      meta.side === "right" ? styles.rowReverse : ""
                    }`}
                  >
                    <div className={styles.avatarWrap}>
                      <img
                        src={meta.avatar}
                        alt={meta.name}
                        className={styles.avatar}
                        loading="lazy"
                      />
                      <span className={styles.nameBadge}>{meta.name}</span>
                    </div>
                    <div className={styles.bubble}>{line.text}</div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={proceed}
            >
              {ctaLabel} →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
