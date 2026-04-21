"use client";

import { useEffect, useRef } from "react";
import styles from "./StarField.module.css";

export function StarField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    // 星を生成
    const stars: HTMLDivElement[] = [];
    for (let i = 0; i < 220; i++) {
      const star = document.createElement("div");
      star.className = styles.star;
      const size = Math.random() * 2.2 + 0.4;
      const dur = 3 + Math.random() * 5;
      star.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation-delay:${(Math.random() * 6).toFixed(2)}s;
        animation-duration:${dur.toFixed(2)}s;
        opacity:${(Math.random() * 0.5 + 0.1).toFixed(2)};
      `;
      field.appendChild(star);
      stars.push(star);
    }

    // 流れ星を定期生成
    const createShootingStar = () => {
      const ss = document.createElement("div");
      ss.className = styles.shootingStar;
      ss.style.cssText = `
        top:${(Math.random() * 55).toFixed(1)}%;
        left:${(Math.random() * 55).toFixed(1)}%;
      `;
      field.appendChild(ss);
      setTimeout(() => {
        if (field.contains(ss)) field.removeChild(ss);
      }, 1600);
    };

    const interval = setInterval(createShootingStar, 2800);
    createShootingStar();

    return () => {
      clearInterval(interval);
      stars.forEach((s) => {
        if (field.contains(s)) field.removeChild(s);
      });
    };
  }, []);

  return (
    <>
      <div ref={fieldRef} className={styles.starField} aria-hidden="true" />
      <div className={styles.galaxyFog} aria-hidden="true" />
    </>
  );
}
