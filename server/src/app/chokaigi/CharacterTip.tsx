"use client";
import Image from "next/image";
import { GUIDES } from "./lp-content";
import styles from "./CharacterTip.module.css";

type CharacterName = "konta" | "rink" | "tanunee";

interface CharacterTipProps {
  character: CharacterName;
  message: string;
  position?: "left" | "right";
  /** 親レイアウト用（余白の詰めなど） */
  className?: string;
}

const CHARACTER_MAP: Record<CharacterName, (typeof GUIDES)[number]> = {
  konta: GUIDES.find((g) => g.name === "こん太")!,
  rink: GUIDES.find((g) => g.name === "りんく")!,
  tanunee: GUIDES.find((g) => g.name === "たぬ姉")!,
};

export function CharacterTip({
  character,
  message,
  position = "left",
  className,
}: CharacterTipProps) {
  const guide = CHARACTER_MAP[character];
  const rootClass = [styles.container, position === "right" ? styles.right : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className={styles.avatar}>
        <Image
          src={guide.imageSrc}
          alt={guide.name}
          width={60}
          height={60}
          className={styles.avatarImg}
        />
      </div>
      <div className={styles.bubble}>
        <span className={styles.name}>{guide.name}</span>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
