"use client";

import { useEffect, useRef, useState } from "react";
import type { PetType } from "./data";

/**
 * PetCompanion — a small intelligent creature that roams a container.
 *
 * Behaviours:
 *  - Idle / wander: picks a random target every few seconds and walks there.
 *  - Cursor chase: when the cursor moves close (<240px), the pet sprints toward it.
 *  - Click reaction: a click anywhere makes the pet jump and emit a heart bubble.
 *  - DOM-aware: every ~12s it picks a heading / link / image inside the
 *    container and walks to it ("inspecting" it).
 *  - Drag: the pet can be picked up and tossed; it lands and shakes off.
 *  - Scroll-aware: when the container scrolls, the pet follows the scroll.
 *  - Speech bubbles: shows short context-aware messages.
 *
 * Renders as a fixed SVG creature inside a `position: relative` container.
 * Pass `containerRef` to scope it (e.g., to the editor area) or omit to roam
 * the whole viewport (used on the marketing landing page).
 */

interface PetCompanionProps {
  type?: PetType;
  containerRef?: React.RefObject<HTMLElement | null>;
  /** When false, renders nothing. Mount/unmount is fine — the pet has no
   *  persistent state worth preserving across toggles. */
  enabled?: boolean;
  /** Extra z-index to layer above editor chrome but below modals. */
  zIndex?: number;
  /** Disable the speech bubbles (useful on tiny demos). */
  silent?: boolean;
}

type Mood = "idle" | "walking" | "chasing" | "jumping" | "dragged" | "sleeping" | "inspecting";

const SPEED = 1.4; // px per frame at idle
const CHASE_RADIUS = 240;
const PET_SIZE = 44;

const GREETINGS: Record<PetType, string[]> = {
  cat: ["meow", "purr…", "*chirp*", "nap?"],
  fox: ["yip!", "hello", "what's that?", "*sniff*"],
  dragon: ["rawr!", "🔥", "treasure?", "fly!"],
  ghost: ["boo", "…hi", "wooo", "*float*"],
  alien: ["beep", "take me to your notes", "01101", "👽"],
  axolotl: ["blub", "*wiggle*", "splash!", "💧"],
};

export default function PetCompanion({
  type = "cat",
  containerRef,
  enabled = true,
  zIndex = 30,
  silent = false,
}: PetCompanionProps) {
  // Position state held in a ref to avoid re-rendering 60fps; we mirror to a
  // tiny piece of state only when the mood/facing/bubble changes.
  const posRef = useRef({ x: 100, y: 100 });
  const targetRef = useRef({ x: 200, y: 100 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastMoodChangeRef = useRef(Date.now());
  const lastInspectRef = useRef(Date.now());
  const lastChirpRef = useRef(Date.now());
  const elRef = useRef<HTMLDivElement | null>(null);

  const [mood, setMood] = useState<Mood>("idle");
  const [facing, setFacing] = useState<1 | -1>(1);
  const [bubble, setBubble] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces re-render at 30fps for transform

  // ── Initialize position inside container ──────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef?.current ?? document.body;
    const rect = root.getBoundingClientRect();
    const containerW = containerRef ? rect.width : window.innerWidth;
    const containerH = containerRef ? rect.height : window.innerHeight;
    posRef.current = {
      x: Math.max(40, Math.min(containerW - 80, containerW * 0.7)),
      y: Math.max(40, Math.min(containerH - 80, containerH * 0.6)),
    };
    targetRef.current = { ...posRef.current };
  }, [enabled, containerRef]);

  // ── Cursor tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      const root = containerRef?.current ?? document.body;
      const rect = root.getBoundingClientRect();
      cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onClick = (e: MouseEvent) => {
      const root = containerRef?.current ?? document.body;
      const rect = root.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Pet "leaps" toward click point and emits a heart
      const dx = cx - posRef.current.x;
      const dy = cy - posRef.current.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 600) {
        velocityRef.current.x += dx * 0.08;
        velocityRef.current.y -= 8; // jump up
        setMood("jumping");
        if (!silent) showBubble("♡");
        lastMoodChangeRef.current = Date.now();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
    // showBubble is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerRef, silent]);

  // ── DOM-aware wandering: pick interesting elements to "inspect" ───────────
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const root = containerRef?.current ?? document.body;
      const candidates = root.querySelectorAll<HTMLElement>(
        "h1, h2, h3, a, img, button, [data-pet-target]"
      );
      if (candidates.length === 0) return;
      const idx = Math.floor(Math.random() * Math.min(candidates.length, 30));
      const el = candidates[idx];
      const rect = el.getBoundingClientRect();
      const containerRect = root.getBoundingClientRect();
      const tx = rect.left - containerRect.left + rect.width / 2;
      const ty = rect.top - containerRect.top + rect.height + 20;
      // Skip if off-screen
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      targetRef.current = { x: tx, y: ty };
      lastInspectRef.current = Date.now();
      if (!silent && Math.random() < 0.4) {
        const tag = el.tagName.toLowerCase();
        const remarks: Record<string, string> = {
          h1: "ooh, a title",
          h2: "section!",
          h3: "subhead",
          a: "a link?",
          img: "*sniffs*",
          button: "click?",
        };
        showBubble(remarks[tag] ?? "hmm");
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [enabled, containerRef, silent]);

  // ── Drag handling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setMood("idle");
      // Toss: tiny upward bounce
      velocityRef.current.y = -3;
      if (!silent) showBubble("woah!");
    };
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const root = containerRef?.current ?? document.body;
      const rect = root.getBoundingClientRect();
      posRef.current.x = e.clientX - rect.left - dragOffsetRef.current.x;
      posRef.current.y = e.clientY - rect.top - dragOffsetRef.current.y;
    };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerRef, silent]);

  // ── Speech bubble helper ──────────────────────────────────────────────────
  const showBubble = (text: string) => {
    setBubble(text);
    window.setTimeout(() => setBubble((current) => (current === text ? null : current)), 2200);
  };

  // ── Random chirps ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || silent) return;
    const id = setInterval(() => {
      if (Math.random() < 0.4 && Date.now() - lastChirpRef.current > 8000) {
        const lines = GREETINGS[type] ?? GREETINGS.cat;
        showBubble(lines[Math.floor(Math.random() * lines.length)]);
        lastChirpRef.current = Date.now();
      }
    }, 6000);
    return () => clearInterval(id);
  }, [enabled, silent, type]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      const root = containerRef?.current ?? document.body;
      const rect = root.getBoundingClientRect();
      const containerW = containerRef ? rect.width : window.innerWidth;
      const containerH = containerRef ? rect.height : window.innerHeight;

      if (!draggingRef.current) {
        // Decide target
        const cursor = cursorRef.current;
        let activeMood: Mood = mood;
        let tx = targetRef.current.x;
        let ty = targetRef.current.y;

        if (cursor) {
          const dx = cursor.x - posRef.current.x;
          const dy = cursor.y - posRef.current.y;
          const distC = Math.hypot(dx, dy);
          if (distC < CHASE_RADIUS && distC > 30) {
            tx = cursor.x - 30 * Math.sign(dx);
            ty = cursor.y + 10;
            activeMood = "chasing";
          } else if (Date.now() - lastMoodChangeRef.current > 5000) {
            // Wander: pick a new random target occasionally
            if (Math.hypot(targetRef.current.x - posRef.current.x, targetRef.current.y - posRef.current.y) < 20) {
              targetRef.current = {
                x: 40 + Math.random() * Math.max(60, containerW - 80),
                y: 40 + Math.random() * Math.max(60, containerH - 80),
              };
              activeMood = "walking";
              lastMoodChangeRef.current = Date.now();
            }
          }
        }

        // Move toward target
        const ddx = tx - posRef.current.x;
        const ddy = ty - posRef.current.y;
        const distT = Math.hypot(ddx, ddy);
        const speed = activeMood === "chasing" ? SPEED * 2.4 : SPEED;
        if (distT > 1) {
          const step = Math.min(speed * (dt / 16), distT);
          velocityRef.current.x = (ddx / distT) * step;
        } else {
          velocityRef.current.x *= 0.8;
        }
        // Gravity-like settle on Y when not chasing/jumping
        if (activeMood !== "chasing" && activeMood !== "jumping") {
          velocityRef.current.y = (ddy) * 0.04;
        } else {
          velocityRef.current.y += 0.6; // gravity for jumps
        }

        posRef.current.x += velocityRef.current.x;
        posRef.current.y += velocityRef.current.y;

        // Clamp to container
        posRef.current.x = Math.max(8, Math.min(containerW - PET_SIZE - 8, posRef.current.x));
        posRef.current.y = Math.max(8, Math.min(containerH - PET_SIZE - 8, posRef.current.y));

        // Land from jump
        if (mood === "jumping" && Math.abs(velocityRef.current.y) < 0.5 && Date.now() - lastMoodChangeRef.current > 600) {
          setMood("idle");
        }

        // Update facing from horizontal velocity
        if (Math.abs(velocityRef.current.x) > 0.2) {
          setFacing(velocityRef.current.x > 0 ? 1 : -1);
        }

        if (mood !== activeMood && mood !== "jumping") setMood(activeMood);
      }

      // Force re-render at 30fps
      setTick((t) => (t + 1) & 0xff);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerRef]);

  if (!enabled) return null;

  // bobbing for walking animation
  const bob = mood === "walking" || mood === "chasing" ? Math.sin(tick * 0.4) * 2 : 0;

  return (
    <div
      ref={elRef}
      className="pointer-events-auto select-none"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PET_SIZE,
        height: PET_SIZE,
        transform: `translate3d(${posRef.current.x}px, ${posRef.current.y + bob}px, 0)`,
        cursor: draggingRef.current ? "grabbing" : "grab",
        zIndex,
        willChange: "transform",
        transition: "filter 0.2s",
        filter: mood === "sleeping" ? "saturate(0.6) brightness(0.8)" : "none",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        const rect = elRef.current?.getBoundingClientRect();
        if (rect) {
          dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        setMood("dragged");
      }}
      role="img"
      aria-label={`${type} companion`}
    >
      {bubble && (
        <div
          style={{
            position: "absolute",
            bottom: PET_SIZE + 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-obsidian-surface, #252535)",
            color: "var(--color-obsidian-text, #cdd6f4)",
            border: "1px solid var(--color-obsidian-border, #353550)",
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: 11,
            whiteSpace: "nowrap",
            fontFamily: "system-ui, sans-serif",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            animation: "pet-bubble-in 0.18s ease-out",
          }}
        >
          {bubble}
        </div>
      )}
      <div
        style={{
          width: PET_SIZE,
          height: PET_SIZE,
          transform: `scaleX(${facing})`,
          transition: "transform 0.12s",
        }}
      >
        <PetSprite type={type} mood={mood} />
      </div>
      <style>{`
        @keyframes pet-bubble-in {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Sprite drawings ──────────────────────────────────────────────────────────

function PetSprite({ type, mood }: { type: PetType; mood: Mood }) {
  const eyeY = mood === "sleeping" ? 22 : 20;
  const eyeShape = mood === "sleeping" ? (
    <>
      <path d="M14 22 q3 -2 6 0" stroke="#0b0610" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M24 22 q3 -2 6 0" stroke="#0b0610" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ) : (
    <>
      <circle cx="17" cy={eyeY} r="2.2" fill="#0b0610" />
      <circle cx="27" cy={eyeY} r="2.2" fill="#0b0610" />
      <circle cx="17.6" cy={eyeY - 0.8} r="0.7" fill="#fff" />
      <circle cx="27.6" cy={eyeY - 0.8} r="0.7" fill="#fff" />
    </>
  );

  switch (type) {
    case "cat":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <g>
            {/* tail */}
            <path d="M40 30 q4 -6 -2 -10" stroke="#e0a16d" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* body */}
            <ellipse cx="22" cy="28" rx="14" ry="10" fill="#e0a16d" />
            {/* head */}
            <circle cx="22" cy="20" r="11" fill="#f4c98e" />
            {/* ears */}
            <path d="M13 14 L11 6 L18 12 Z" fill="#e0a16d" />
            <path d="M31 14 L33 6 L26 12 Z" fill="#e0a16d" />
            <path d="M14 12 L13 8 L17 11 Z" fill="#ff9eb5" />
            <path d="M30 12 L31 8 L27 11 Z" fill="#ff9eb5" />
            {eyeShape}
            {/* nose + mouth */}
            <path d="M22 24 l-1 1 h2 z" fill="#0b0610" />
            <path d="M22 25 q-2 2 -3 1 M22 25 q2 2 3 1" stroke="#0b0610" strokeWidth="1" fill="none" />
            {/* whiskers */}
            <path d="M14 24 h-3 M30 24 h3 M14 25 h-3 M30 25 h3" stroke="#5a3a1c" strokeWidth="0.6" />
          </g>
        </svg>
      );
    case "fox":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <path d="M40 32 q5 -4 0 -10 q-3 4 -2 10z" fill="#fff" />
          <path d="M40 32 q5 -4 0 -10" stroke="#d96e2a" strokeWidth="2" fill="none" />
          <ellipse cx="22" cy="29" rx="13" ry="9" fill="#d96e2a" />
          <path d="M9 22 L22 12 L35 22 L29 28 H15 Z" fill="#e88643" />
          <path d="M11 18 L8 8 L17 14 Z" fill="#d96e2a" />
          <path d="M33 18 L36 8 L27 14 Z" fill="#d96e2a" />
          <path d="M22 18 L18 26 H26 Z" fill="#fff" />
          {eyeShape}
          <ellipse cx="22" cy="24" rx="1.4" ry="1" fill="#0b0610" />
        </svg>
      );
    case "dragon":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <path d="M6 22 q4 -8 12 -10 l8 -1 q12 0 14 12 q-2 8 -12 8 H14 q-8 0 -8 -9z" fill="#5fc56e" />
          <path d="M30 14 q5 -2 8 0" stroke="#3aa54a" strokeWidth="2" fill="none" />
          <path d="M14 14 q-2 -6 2 -8 l1 6z M22 12 q-2 -6 2 -8 l1 6z" fill="#3aa54a" />
          <ellipse cx="32" cy="20" rx="6" ry="5" fill="#7fd98d" />
          <circle cx="33" cy="19" r="2" fill="#0b0610" />
          <circle cx="33.6" cy="18.4" r="0.7" fill="#fff" />
          <path d="M36 22 q3 1 4 0" stroke="#0b0610" strokeWidth="1" fill="none" />
          <path d="M37 23 q1 2 3 1" stroke="#ff7a4a" strokeWidth="1.3" fill="none" />
        </svg>
      );
    case "ghost":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <path d="M8 22 a14 14 0 0 1 28 0 v14 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3 z"
            fill="rgba(255,255,255,0.92)" stroke="rgba(120,120,200,0.4)" strokeWidth="1" />
          {eyeShape}
          <ellipse cx="22" cy="27" rx="3" ry="2" fill="#3a2050" />
          <ellipse cx="14" cy="24" rx="2.5" ry="1.4" fill="#ffd6e1" opacity="0.6" />
          <ellipse cx="30" cy="24" rx="2.5" ry="1.4" fill="#ffd6e1" opacity="0.6" />
        </svg>
      );
    case "alien":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <ellipse cx="22" cy="32" rx="13" ry="6" fill="#7fffd4" opacity="0.5" />
          <path d="M10 22 q0 -14 12 -14 q12 0 12 14 q0 6 -4 10 H14 q-4 -4 -4 -10z" fill="#bff5a8" />
          <ellipse cx="16" cy="22" rx="3" ry="5" fill="#0b0610" />
          <ellipse cx="28" cy="22" rx="3" ry="5" fill="#0b0610" />
          <ellipse cx="16.6" cy="20" rx="0.9" ry="1.6" fill="#fff" />
          <ellipse cx="28.6" cy="20" rx="0.9" ry="1.6" fill="#fff" />
          <path d="M19 30 q3 2 6 0" stroke="#0b0610" strokeWidth="1" fill="none" />
          <line x1="22" y1="8" x2="22" y2="3" stroke="#bff5a8" strokeWidth="1.5" />
          <circle cx="22" cy="2.5" r="1.4" fill="#ff5fa0" />
        </svg>
      );
    case "axolotl":
      return (
        <svg viewBox="0 0 44 44" width="44" height="44">
          <ellipse cx="22" cy="28" rx="14" ry="9" fill="#ff9bcb" />
          <circle cx="22" cy="20" r="11" fill="#ffb5d6" />
          {/* gills */}
          <path d="M9 16 q-4 2 -2 6 M11 14 q-5 0 -4 5 M33 14 q5 0 4 5 M35 16 q4 2 2 6" stroke="#ff5fa0" strokeWidth="2" fill="none" strokeLinecap="round" />
          {eyeShape}
          <path d="M19 25 q3 2 6 0" stroke="#0b0610" strokeWidth="1" fill="none" />
          <circle cx="14" cy="22" r="1.6" fill="#ffd6e8" opacity="0.7" />
          <circle cx="30" cy="22" r="1.6" fill="#ffd6e8" opacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
}
