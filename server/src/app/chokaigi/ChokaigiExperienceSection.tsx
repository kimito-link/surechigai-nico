"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AR_CAMERA_CTA_START,
  AR_CAMERA_CTA_STOP,
  AR_CAMERA_ERROR,
  AR_CAMERA_NOTE,
  AR_DEMO_OVERLAY_SRC,
  AR_EXPERIENCE_INTRO,
  AR_EXPERIENCE_TITLE,
  AR_WEBXR_STATUS_CHECKING,
  AR_WEBXR_STATUS_ERROR,
  AR_WEBXR_STATUS_NO,
  AR_WEBXR_STATUS_YES,
  EXPERIENCE_REVEAL_CARDS,
  EXPERIENCE_SECTION_HEADING_ID,
  EXPERIENCE_SECTION_LEAD,
  EXPERIENCE_SECTION_TITLE,
} from "./lp-content";
import styles from "./chokaigi.module.css";

type WebxrUiState = "checking" | "yes" | "no" | "error";

type NavigatorWithXr = Navigator & {
  xr?: { isSessionSupported(mode: string): Promise<boolean> };
};

export function ChokaigiExperienceSection() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webxrState, setWebxrState] = useState<WebxrUiState>("checking");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const xr =
      typeof navigator !== "undefined"
        ? (navigator as NavigatorWithXr).xr
        : undefined;
    if (!xr?.isSessionSupported) {
      setWebxrState("no");
      return;
    }
    setWebxrState("checking");
    xr
      .isSessionSupported("immersive-ar")
      .then((ok) => {
        if (!cancelled) setWebxrState(ok ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setWebxrState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      cardRefs.current.forEach((el) => {
        if (el) el.classList.add(styles.experienceRevealCardVisible);
      });
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.experienceRevealCardVisible);
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: [0, 0.08, 0.2] }
    );
    cardRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [reducedMotion, styles.experienceRevealCardVisible]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError(AR_CAMERA_ERROR);
    }
  }, []);

  const webxrMessage =
    webxrState === "checking"
      ? AR_WEBXR_STATUS_CHECKING
      : webxrState === "yes"
        ? AR_WEBXR_STATUS_YES
        : webxrState === "error"
          ? AR_WEBXR_STATUS_ERROR
          : AR_WEBXR_STATUS_NO;

  return (
    <section
      className={`${styles.section} ${styles.experienceSection}`}
      aria-labelledby={EXPERIENCE_SECTION_HEADING_ID}
    >
      <h2 id={EXPERIENCE_SECTION_HEADING_ID}>{EXPERIENCE_SECTION_TITLE}</h2>
      <p className={styles.sectionLead}>{EXPERIENCE_SECTION_LEAD}</p>

      <div className={styles.experienceRevealGrid}>
        {EXPERIENCE_REVEAL_CARDS.map((c, i) => (
          <div
            key={c.title}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={styles.experienceRevealCard}
          >
            <h3 className={styles.experienceRevealCardTitle}>{c.title}</h3>
            <p className={styles.experienceRevealCardBody}>{c.body}</p>
          </div>
        ))}
      </div>

      <div className={styles.arExperiencePanel}>
        <h3 className={styles.arExperienceTitle}>{AR_EXPERIENCE_TITLE}</h3>
        <p className={styles.arExperienceIntro}>{AR_EXPERIENCE_INTRO}</p>
        <p className={styles.arWebxrStatus} role="status" aria-live="polite">
          {webxrMessage}
        </p>

        <div className={styles.arCameraDemo}>
          {!cameraOn ? (
            <button
              type="button"
              className={styles.arCameraBtn}
              onClick={() => void startCamera()}
            >
              {AR_CAMERA_CTA_START}
            </button>
          ) : (
            <>
              <div className={styles.arCameraViewport}>
                <video
                  ref={videoRef}
                  className={styles.arCameraVideo}
                  playsInline
                  muted
                  autoPlay
                />
                <img
                  src={AR_DEMO_OVERLAY_SRC}
                  alt=""
                  className={styles.arCameraOverlayImg}
                  width={140}
                  height={180}
                />
              </div>
              <button
                type="button"
                className={styles.arCameraBtnSecondary}
                onClick={stopCamera}
              >
                {AR_CAMERA_CTA_STOP}
              </button>
            </>
          )}
        </div>
        {cameraError ? (
          <p className={styles.arCameraError} role="alert">
            {cameraError}
          </p>
        ) : null}
        <p className={styles.arCameraFinePrint}>{AR_CAMERA_NOTE}</p>
      </div>
    </section>
  );
}
