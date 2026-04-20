"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import styles from "./ZoomableMap.module.css";

type Props = {
  children: ReactNode;
};

export function ZoomableMap({ children }: Props) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  const handleZoomIn = () => {
    setScale((s) => Math.min(MAX_SCALE, s + 0.5));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(MIN_SCALE, s - 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = position;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    setPosition({
      x: lastPos.current.x + dx,
      y: lastPos.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPos.current = position;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    setPosition({
      x: lastPos.current.x + dx,
      y: lastPos.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale < 2) {
      setScale(2);
    } else {
      handleReset();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* コントロールボタン */}
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={handleZoomOut} title="縮小">
          −
        </button>
        <span className={styles.scaleLabel}>{Math.round(scale * 100)}%</span>
        <button className={styles.controlBtn} onClick={handleZoomIn} title="拡大">
          ＋
        </button>
        <button className={styles.resetBtn} onClick={handleReset} title="リセット">
          ↺
        </button>
      </div>

      {/* ヒント */}
      <div className={styles.hint}>
        ダブルタップで拡大 / ドラッグで移動
      </div>

      {/* ズーム可能エリア */}
      <div
        ref={containerRef}
        className={`${styles.container} ${isDragging ? styles.dragging : ""}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={styles.content}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
