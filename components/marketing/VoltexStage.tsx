"use client";

import { useEffect, useState } from "react";

/**
 * VoltexStage — typographic atom for voltex.devlune.in (Voltex Notes).
 * A knowledge-graph rendered as concentric rings of markdown-flavored text
 * orbiting a massive italic serif `V`, with floating note nodes connected by
 * pulsing edges. Idle = slow drift. Active = fast counter-spin + connecting
 * edges + sync ping.
 */
export function VoltexStage({ active = false }: { active?: boolean }) {
  const speed = active ? 1 : 0.32;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 12), 220);
    return () => clearInterval(id);
  }, [active]);

  const ACCENT = "#a78bfa"; // violet
  const ACCENT2 = "#22d3ee"; // cyan — link/sync
  const INK = "#f4f0e6";

  const nodes = [
    { x: -120, y: -90, label: "ideas", r: 5 },
    { x: 130, y: -70, label: "daily", r: 4 },
    { x: 150, y: 40, label: "specs", r: 5 },
    { x: 60, y: 130, label: "MOC", r: 6 },
    { x: -110, y: 120, label: "refs", r: 4 },
    { x: -160, y: 10, label: "todo", r: 5 },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] border border-foreground/[0.06]">
      <style>{`
        @keyframes vs-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vs-glowpulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }
        @keyframes vs-edge-pulse {
          0%, 100% { stroke-opacity: 0.18; }
          50% { stroke-opacity: 0.7; }
        }
        @keyframes vs-node-blink {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-0" style={{ background: "rgb(8 8 14)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 28%, rgba(167,139,250,0.32), transparent 60%), radial-gradient(ellipse 55% 50% at 75% 75%, rgba(34,211,238,0.22), transparent 60%)",
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="vs-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke={INK} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vs-grid)" />
      </svg>

      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: active ? ACCENT : "#34d399",
            animation: active ? "vs-glowpulse 1.6s ease-in-out infinite" : undefined,
          }}
        />
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(244,240,230,0.6)" }}
        >
          {active ? "syncing" : "vault open"}
        </span>
      </div>
      <div
        className="absolute right-5 top-5 z-10 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(244,240,230,0.4)" }}
      >
        graph.v1 · offline-first
      </div>
      <div className="absolute bottom-5 left-5 z-10 flex items-baseline gap-1">
        <span
          className="text-2xl italic"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "rgba(244,240,230,0.85)" }}
        >
          voltex
        </span>
        <span
          className="text-2xl italic"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: ACCENT }}
        >
          /
        </span>
      </div>
      <div
        className="absolute bottom-5 right-5 z-10 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(244,240,230,0.4)" }}
      >
        notes · {nodes.length}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="-200 -200 400 400"
          className="h-[88%] w-[88%] max-h-[440px] max-w-[440px]"
        >
          <defs>
            <path id="vs-ring1" d="M -180 0 a 180 180 0 1 1 360 0 a 180 180 0 1 1 -360 0" />
            <path id="vs-ring2" d="M 130 0 a 130 130 0 1 0 -260 0 a 130 130 0 1 0 260 0" />
            <path id="vs-ring3" d="M -85 0 a 85 85 0 1 1 170 0 a 85 85 0 1 1 -170 0" />
            <radialGradient id="vs-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
              <stop offset="60%" stopColor={ACCENT} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </radialGradient>
          </defs>

          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const major = i % 6 === 0;
            return (
              <line
                key={`t-${i}`}
                x1="0"
                y1="-195"
                x2="0"
                y2={major ? -184 : -190}
                stroke="rgba(244,240,230,0.32)"
                strokeWidth={major ? 1.4 : 0.6}
                transform={`rotate(${angle})`}
              />
            );
          })}

          <g
            style={{
              transformOrigin: "center",
              animation: `vs-rotate ${36 / speed}s linear infinite`,
            }}
          >
            <circle r="180" cx="0" cy="0" fill="none" stroke="rgba(244,240,230,0.10)" strokeDasharray="3 7" />
            <text fill="rgba(244,240,230,0.65)" fontSize="13" letterSpacing="6" style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}>
              <textPath href="#vs-ring1">
                · NOTES · LINKS · GRAPH · SYNC · VAULT · MARKDOWN · BACKLINKS · OFFLINE · OPEN-SOURCE ·
              </textPath>
            </text>
          </g>

          <g
            style={{
              transformOrigin: "center",
              animation: `vs-rotate ${24 / speed}s linear infinite reverse`,
            }}
          >
            <circle r="130" cx="0" cy="0" fill="none" stroke="rgba(167,139,250,0.32)" strokeWidth="1" />
            <text fill={ACCENT} fontSize="14" letterSpacing="4" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }} fontStyle="italic" fontWeight="500">
              <textPath href="#vs-ring2">
                writing · linking · thinking · connecting · drafting · syncing · refactoring · linking ·
              </textPath>
            </text>
          </g>

          <g
            style={{
              transformOrigin: "center",
              animation: `vs-rotate ${14 / speed}s linear infinite`,
            }}
          >
            <circle r="85" cx="0" cy="0" fill="none" stroke="rgba(244,240,230,0.18)" />
            <text fill="rgba(244,240,230,0.7)" fontSize="9" letterSpacing="2.5" style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}>
              <textPath href="#vs-ring3">
                [[idea]] · [[note]] · [[link]] · [[ref]] · [[moc]] · [[todo]] · [[graph]] · [[tag]] · [[date]] ·
              </textPath>
            </text>
          </g>

          {active &&
            nodes.map((n, i) => (
              <line
                key={`e-${i}`}
                x1="0"
                y1="0"
                x2={n.x}
                y2={n.y}
                stroke={i % 2 === 0 ? ACCENT : ACCENT2}
                strokeWidth="0.8"
                strokeDasharray="2 4"
                style={{
                  animation: `vs-edge-pulse ${1.4 + i * 0.18}s ease-in-out infinite`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}

          {nodes.map((n, i) => (
            <g
              key={`n-${i}`}
              transform={`translate(${n.x}, ${n.y})`}
              style={{
                animation: active ? `vs-node-blink ${1.6 + i * 0.2}s ease-in-out infinite` : undefined,
              }}
            >
              <circle r={n.r + 4} fill="none" stroke={i % 2 === 0 ? ACCENT : ACCENT2} strokeWidth="0.6" opacity="0.4" />
              <circle r={n.r} fill={i % 2 === 0 ? ACCENT : ACCENT2} opacity={active ? 0.9 : 0.55} />
              <text
                x="0"
                y={n.y > 60 ? -n.r - 8 : n.r + 12}
                textAnchor="middle"
                fill="rgba(244,240,230,0.7)"
                fontSize="8"
                letterSpacing="1.2"
                style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
              >
                {n.label}
              </text>
            </g>
          ))}

          {active &&
            Array.from({ length: 6 }).map((_, i) => {
              const a = ((i + tick * 0.5) * 360) / 6;
              return (
                <g key={`sp-${i}`} transform={`rotate(${a})`}>
                  <line x1="0" y1="-160" x2="0" y2="-148" stroke={ACCENT2} strokeWidth="1.2" opacity="0.85" />
                  <circle cx="0" cy="-154" r="1.2" fill={ACCENT2} />
                </g>
              );
            })}

          <circle r="60" cx="0" cy="0" fill="url(#vs-core)" opacity={active ? 1 : 0.6} />

          <text
            x="0"
            y="6"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={INK}
            fontSize="155"
            fontStyle="italic"
            fontWeight="500"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              filter: active
                ? "drop-shadow(0 0 16px rgba(167,139,250,0.6))"
                : "drop-shadow(0 0 8px rgba(244,240,230,0.15))",
              transition: "filter 0.4s ease-out",
            }}
          >
            V
          </text>

          <g
            style={{
              transformOrigin: "center",
              animation: `vs-rotate ${10 / speed}s linear infinite`,
            }}
          >
            <circle cx="0" cy="-85" r="3" fill={ACCENT} />
            <circle cx="0" cy="-85" r="6" fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.5" />
          </g>
        </svg>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700"
        style={{ background: ACCENT, opacity: active ? 0.5 : 0.22 }}
      />

      <div className="absolute inset-x-5 bottom-16 z-10 flex items-center gap-2 sm:bottom-14">
        <div className="h-px flex-1" style={{ background: "rgba(244,240,230,0.12)" }} />
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur-sm"
          style={{ borderColor: "rgba(244,240,230,0.15)", background: "rgba(244,240,230,0.04)" }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(244,240,230,0.55)" }}>
            local ⇄ cloud
          </span>
          <span className="h-1 w-1 rounded-full" style={{ background: ACCENT }} />
          <span className="font-mono text-[9px] tabular-nums" style={{ color: "rgba(244,240,230,0.7)" }}>
            {active ? "SYNCING VAULT" : "READY"}
          </span>
        </div>
        <div className="h-px flex-1" style={{ background: "rgba(244,240,230,0.12)" }} />
      </div>
    </div>
  );
}

export default VoltexStage;
