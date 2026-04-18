"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Github,
  Check,
  Minus,
  Download,
  Apple,
  Globe,
  Cpu,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import VoltexStage from "@/components/marketing/VoltexStage";
import PetCompanion from "@/components/obsidian/PetCompanion";
import type { PetType } from "@/components/obsidian/data";

/* ──────────────────────────────────────────────────────────────────────────
   Voltex Notes — marketing landing
   Aesthetic: editorial / literary tech. Dark warm-cream type on near-black.
   Display: Fraunces italic. UI/label: JetBrains Mono. Body: Inter.
   Accent: violet #a78bfa. Link/sync: cyan #22d3ee.
   ────────────────────────────────────────────────────────────────────────── */

const INK = "#f4f0e6";
const SUB = "rgba(244,240,230,0.65)";
const DIM = "rgba(244,240,230,0.4)";
const LINE = "rgba(244,240,230,0.08)";
const LINE_STRONG = "rgba(244,240,230,0.16)";
const VIOLET = "#a78bfa";
const CYAN = "#22d3ee";
const BG = "#08080e";
const SURF = "#0e0e16";
const CARD = "#11121b";

const SERIF: React.CSSProperties = { fontFamily: "var(--font-fraunces), Georgia, serif" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" };

/* ── small utilities ─────────────────────────────────────────────────────── */

function MonoLabel({
  children,
  color,
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`text-[10px] uppercase tracking-[0.22em] ${className}`}
      style={{ ...MONO, color: color ?? DIM }}
    >
      {children}
    </span>
  );
}

function ChapterTag({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] tabular-nums" style={{ color: VIOLET }}>
        §{n}
      </span>
      <span className="h-px w-6" style={{ background: LINE_STRONG }} />
      <MonoLabel>{label}</MonoLabel>
    </div>
  );
}

/* ── data ────────────────────────────────────────────────────────────────── */

const NAV = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "How it works", href: "#how" },
  { label: "Compare", href: "#compare" },
  { label: "Download", href: "#download" },
];

const TENETS = [
  {
    n: "i",
    title: "Local-first, always",
    body:
      "Your vault lives on your machine as plain Markdown. Sync is opt-in. The app works flat on a subway, on a flight, on an island.",
  },
  {
    n: "ii",
    title: "Linked thought, not folders",
    body:
      "Wikilinks, backlinks, and a real graph view make your notes a network. Folders are still there — but they're no longer the point.",
  },
  {
    n: "iii",
    title: "Open source, no telemetry",
    body:
      "MIT licensed. Zero analytics. Zero tracking. Read the source, fork the source, ship plugins to the marketplace.",
  },
];

const CAPABILITIES = [
  {
    n: "02-A",
    title: "Graph view",
    desc: "A force-directed map of your second brain. Hover a node — its neighborhood lights up.",
    accent: VIOLET,
    span: "lg:col-span-8",
    minH: "min-h-[460px]",
  },
  {
    n: "02-B",
    title: "Real-time sync",
    desc: "Encrypted, debounced, conflict-aware. Edit on desktop, keep typing on web.",
    accent: CYAN,
    span: "lg:col-span-4",
    minH: "min-h-[460px]",
  },
  {
    n: "02-C",
    title: "Markdown, sharpened",
    desc: "GFM + math + Mermaid + Excalidraw + Kanban. One canvas, many shapes.",
    accent: INK,
    span: "lg:col-span-4",
    minH: "min-h-[340px]",
  },
  {
    n: "02-D",
    title: "Bidirectional links",
    desc: "[[wikilinks]] resolve in milliseconds. Backlinks panel always knows.",
    accent: VIOLET,
    span: "lg:col-span-4",
    minH: "min-h-[340px]",
  },
  {
    n: "02-E",
    title: "Version history",
    desc: "Every save snapshotted locally. Time-travel any note back to last Tuesday.",
    accent: CYAN,
    span: "lg:col-span-4",
    minH: "min-h-[340px]",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Open a vault",
    body: "Pick a folder on disk, or start fresh. Voltex indexes your Markdown in seconds.",
  },
  {
    n: "02",
    title: "Write & link",
    body: "Type [[ to link. Drop ![[ to embed. The graph rebuilds as you go.",
  },
  {
    n: "03",
    title: "Sync, share, ship",
    body: "Sign in to sync across devices. Publish a note as a public page. Export to PDF.",
  },
];

const ROWS = [
  { feature: "Open source", voltex: true, obsidian: false, notion: false, evernote: false },
  { feature: "Local-first storage", voltex: true, obsidian: true, notion: false, evernote: false },
  { feature: "Real-time cloud sync", voltex: "Free", obsidian: "Paid", notion: true, evernote: true },
  { feature: "Bidirectional links", voltex: true, obsidian: true, notion: false, evernote: false },
  { feature: "Graph view", voltex: true, obsidian: true, notion: false, evernote: false },
  { feature: "Plugin ecosystem", voltex: true, obsidian: true, notion: false, evernote: false },
  { feature: "Web, desktop, mobile", voltex: true, obsidian: true, notion: true, evernote: true },
  { feature: "Zero telemetry", voltex: true, obsidian: true, notion: false, evernote: false },
  { feature: "Price", voltex: "Free", obsidian: "$$ for sync", notion: "$$$", evernote: "$$$" },
];

const DOWNLOADS: { label: string; icon: typeof Cpu; hint: string; href?: string; soon?: boolean }[] = [
  {
    label: "Windows",
    icon: Cpu,
    hint: ".exe · v1.3.0",
    href: "https://github.com/Dev-Lune/voltex-notes/releases/latest",
  },
  {
    label: "Web app",
    icon: Globe,
    hint: "voltex.devlune.in/notes",
    href: "/notes",
  },
  {
    label: "macOS",
    icon: Apple,
    hint: "coming soon",
    soon: true,
  },
  {
    label: "Android",
    icon: Smartphone,
    hint: "coming soon",
    soon: true,
  },
];

/* ════════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [stageActive, setStageActive] = useState(false);

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: BG, color: INK, fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes vx-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes vx-blink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .vx-link { position: relative; transition: color .2s ease; }
        .vx-link::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -3px;
          height: 1px; background: ${VIOLET}; transform: scaleX(0); transform-origin: left;
          transition: transform .25s ease;
        }
        .vx-link:hover { color: ${INK}; }
        .vx-link:hover::after { transform: scaleX(1); }
        .vx-card { transition: border-color .25s ease, transform .25s ease, background .25s ease; }
        .vx-card:hover { border-color: rgba(167,139,250,0.35); transform: translateY(-2px); }
        .vx-cta-primary { transition: transform .15s ease, box-shadow .25s ease; }
        .vx-cta-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 40px -12px rgba(167,139,250,0.6); }
        .vx-cta-ghost { transition: border-color .2s ease, background .2s ease; }
        .vx-cta-ghost:hover { border-color: rgba(244,240,230,0.4); background: rgba(244,240,230,0.04); }
        .vx-row:hover { background: rgba(167,139,250,0.04); }
      `}</style>

      {/* faint global grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: LINE, background: "rgba(8,8,14,0.72)" }}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="text-2xl italic leading-none" style={{ ...SERIF, color: INK }}>
              voltex
            </span>
            <span className="text-2xl italic leading-none" style={{ ...SERIF, color: VIOLET }}>
              /
            </span>
            <span className="ml-1 hidden text-[10px] uppercase tracking-[0.22em] sm:inline" style={{ ...MONO, color: DIM }}>
              notes · v1.3
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="vx-link text-[12px] uppercase tracking-[0.18em]" style={{ ...MONO, color: SUB }}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/Dev-Lune/voltex-notes"
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-2 rounded-full border px-4 text-[11px] uppercase tracking-[0.2em] sm:inline-flex"
              style={{ ...MONO, borderColor: LINE_STRONG, color: SUB }}
            >
              <Github className="h-3.5 w-3.5" /> Github
            </Link>
            <Link
              href="/notes"
              className="vx-cta-primary inline-flex h-9 items-center gap-2 rounded-full px-4 text-[11px] uppercase tracking-[0.2em]"
              style={{ ...MONO, background: VIOLET, color: "#0b0610" }}
            >
              Open vault <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-b" style={{ borderColor: LINE }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-x-12 gap-y-16 px-6 pb-20 pt-16 md:px-10 md:pt-20 lg:grid-cols-12 lg:gap-y-0 lg:pb-28 lg:pt-24">
          {/* left — copy */}
          <div className="lg:col-span-6 xl:col-span-7">
            <ChapterTag n="01" label="Voltex Notes — Open source" />

            <h1
              className="mt-8 text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px] md:text-[68px] lg:text-[74px]"
              style={{ ...SERIF, fontWeight: 500, color: INK }}
            >
              An{" "}
              <em className="not-italic">
                <span style={{ ...SERIF, fontStyle: "italic", color: VIOLET }}>atom</span>
              </em>{" "}
              for your<br className="hidden sm:inline" />
              <span style={{ fontStyle: "italic" }}>second brain.</span>
            </h1>

            <p
              className="mt-7 max-w-[34rem] text-[15px] leading-[1.7] sm:text-[16px]"
              style={{ color: SUB }}
            >
              Voltex Notes is a fast, local-first knowledge base — Markdown, wikilinks, a real graph view,
              and real-time cloud sync — wrapped in an editor that gets out of the way. Open source. No telemetry.
              Yours forever.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/notes"
                className="vx-cta-primary inline-flex h-12 items-center gap-2 rounded-full px-6 text-[12px] uppercase tracking-[0.2em]"
                style={{ ...MONO, background: VIOLET, color: "#0b0610" }}
              >
                Launch web app <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#download"
                className="vx-cta-ghost inline-flex h-12 items-center gap-2 rounded-full border px-6 text-[12px] uppercase tracking-[0.2em]"
                style={{ ...MONO, borderColor: LINE_STRONG, color: INK }}
              >
                <Download className="h-4 w-4" /> Download desktop
              </a>
            </div>

            {/* meta strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              {[
                { k: "license", v: "MIT" },
                { k: "telemetry", v: "0", accent: VIOLET },
                { k: "stars", v: "★ 1.2k" },
                { k: "platforms", v: "Win · Mac · Linux · Web" },
              ].map((m) => (
                <div key={m.k} className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: DIM }}>
                    {m.k}
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: m.accent ?? INK }}>
                    {m.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* right — stage */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div
              className="relative aspect-square w-full max-w-[560px] cursor-pointer"
              onMouseEnter={() => setStageActive(true)}
              onMouseLeave={() => setStageActive(false)}
              onClick={() => setStageActive((v) => !v)}
            >
              <VoltexStage active={stageActive} />
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <MonoLabel>fig. 01 — knowledge atom</MonoLabel>
              <MonoLabel color={VIOLET}>{stageActive ? "active" : "hover to sync"}</MonoLabel>
            </div>
          </div>
        </div>

        {/* marquee strip */}
        <div className="relative overflow-hidden border-t" style={{ borderColor: LINE }}>
          <div
            className="flex w-max gap-12 py-4 will-change-transform"
            style={{ animation: "vx-marquee 42s linear infinite" }}
          >
            {Array.from({ length: 2 }).flatMap((_, dup) =>
              [
                "markdown · GFM",
                "wikilinks",
                "backlinks panel",
                "graph view",
                "force-directed",
                "Mermaid",
                "Excalidraw canvas",
                "kanban",
                "math · KaTeX",
                "real-time sync",
                "version history",
                "plugin marketplace",
                "themes",
                "command palette · ⌘P",
                "offline-first",
                "encrypted at rest",
                "open source · MIT",
              ].map((w, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="flex items-center gap-12 whitespace-nowrap text-[13px]"
                  style={{ color: SUB }}
                >
                  <span style={{ ...SERIF, fontStyle: "italic" }}>{w}</span>
                  <span style={{ color: VIOLET }}>✦</span>
                </span>
              )),
            )}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-32"
            style={{ background: `linear-gradient(to right, ${BG}, transparent)` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-32"
            style={{ background: `linear-gradient(to left, ${BG}, transparent)` }}
          />
        </div>
      </section>

      {/* ── Manifesto / Tenets ──────────────────────────────────────────── */}
      <section className="relative z-10 border-b" style={{ borderColor: LINE, background: SURF }}>
        <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <ChapterTag n="01.5" label="The thesis" />
              <h2
                className="mt-6 text-[36px] leading-[1.05] tracking-[-0.01em] md:text-[44px]"
                style={{ ...SERIF, fontWeight: 500 }}
              >
                Three rules.<br />
                <span style={{ fontStyle: "italic", color: VIOLET }}>No exceptions.</span>
              </h2>
              <p className="mt-5 text-[14px] leading-[1.7]" style={{ color: SUB }}>
                We built Voltex against a quiet rebellion: the best note app should respect your
                files, your time, and your data. So we wrote down what we wouldn't compromise.
              </p>
            </div>

            <div className="lg:col-span-8">
              <ol className="grid grid-cols-1 gap-px" style={{ background: LINE }}>
                {TENETS.map((t) => (
                  <li
                    key={t.n}
                    className="grid grid-cols-12 gap-6 px-2 py-8"
                    style={{ background: SURF }}
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <span
                        className="text-[28px] tabular-nums sm:text-[32px]"
                        style={{ ...SERIF, fontStyle: "italic", fontWeight: 500, color: VIOLET }}
                      >
                        {t.n}.
                      </span>
                    </div>
                    <div className="col-span-10 sm:col-span-11">
                      <h3
                        className="text-[22px] leading-[1.2] sm:text-[26px]"
                        style={{ ...SERIF, fontWeight: 500, color: INK }}
                      >
                        {t.title}
                      </h3>
                      <p className="mt-3 max-w-[44rem] text-[15px] leading-[1.7]" style={{ color: SUB }}>
                        {t.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pet Companion (live demo) ─────────────────────────────────── */}
      <PetCompanionDemoSection />

      {/* ── Capabilities (bento) ────────────────────────────────────────── */}
      <section id="capabilities" className="relative z-10 border-b" style={{ borderColor: LINE }}>
        <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <ChapterTag n="02" label="Capabilities" />
              <h2
                className="mt-6 text-[36px] leading-[1.05] tracking-[-0.01em] md:text-[52px]"
                style={{ ...SERIF, fontWeight: 500 }}
              >
                A toolkit that{" "}
                <span style={{ fontStyle: "italic", color: VIOLET }}>thinks</span>{" "}
                in links.
              </h2>
            </div>
            <p className="max-w-md text-[14px] leading-[1.7]" style={{ color: SUB }}>
              Five primitives, composed obsessively. None of them get in the way of writing.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
            {CAPABILITIES.map((c) => (
              <article
                key={c.n}
                className={`vx-card relative flex flex-col overflow-hidden rounded-2xl border p-7 ${c.span ?? ""} ${c.minH ?? ""}`}
                style={{ borderColor: LINE_STRONG, background: CARD }}
              >
                {/* corner glyph */}
                <span
                  aria-hidden
                  className="absolute right-5 top-5 h-1.5 w-1.5 rounded-full"
                  style={{ background: c.accent }}
                />
                <MonoLabel>§{c.n}</MonoLabel>
                <h3
                  className="mt-4 text-[26px] leading-[1.15] md:text-[30px]"
                  style={{ ...SERIF, fontWeight: 500, color: INK }}
                >
                  <span style={{ fontStyle: "italic" }}>{c.title}</span>
                </h3>
                <p className="mt-3 max-w-md text-[14px] leading-[1.7]" style={{ color: SUB }}>
                  {c.desc}
                </p>

                {c.n === "02-A" && (
                  <div className="relative mt-6 flex-1 min-h-[240px]">
                    <BigGraph />
                  </div>
                )}
                {c.n === "02-B" && (
                  <div className="mt-auto pt-6">
                    <SyncStrip />
                  </div>
                )}
                {c.n === "02-C" && (
                  <div className="mt-auto pt-6">
                    <pre
                      className="overflow-hidden rounded-lg p-4 text-[12px] leading-[1.65]"
                      style={{ ...MONO, background: BG, color: SUB, border: `1px solid ${LINE}` }}
                    >
                      <span style={{ color: VIOLET }}># Daily — 04/18</span>
                      {"\n"}met w/ [[ana]] re: <span style={{ color: CYAN }}>[[graph-spec]]</span>
                      {"\n"}- [ ] write tests for `linker()`
                    </pre>
                  </div>
                )}
                {c.n === "02-D" && (
                  <div className="mt-auto pt-6">
                    <BacklinksDemo />
                  </div>
                )}
                {c.n === "02-E" && (
                  <div className="mt-auto pt-6">
                    <VersionTimeline />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 border-b" style={{ borderColor: LINE, background: SURF }}>
        <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
          <div className="max-w-2xl">
            <ChapterTag n="03" label="Three steps" />
            <h2
              className="mt-6 text-[36px] leading-[1.05] tracking-[-0.01em] md:text-[52px]"
              style={{ ...SERIF, fontWeight: 500 }}
            >
              From empty folder to <em>networked thought</em> in under a minute.
            </h2>
          </div>

          <ol className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="relative">
                <div className="flex items-center gap-3">
                  <span
                    className="text-[64px] leading-none"
                    style={{ ...SERIF, fontStyle: "italic", fontWeight: 500, color: VIOLET }}
                  >
                    {s.n}
                  </span>
                  <span className="h-px flex-1" style={{ background: LINE_STRONG }} />
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4" style={{ color: DIM }} />
                  )}
                </div>
                <h3
                  className="mt-5 text-[24px] leading-[1.2]"
                  style={{ ...SERIF, fontWeight: 500, color: INK }}
                >
                  {s.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: SUB }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────────────────── */}
      <section id="compare" className="relative z-10 border-b" style={{ borderColor: LINE }}>
        <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <ChapterTag n="04" label="Spec sheet" />
              <h2
                className="mt-6 text-[36px] leading-[1.05] tracking-[-0.01em] md:text-[52px]"
                style={{ ...SERIF, fontWeight: 500 }}
              >
                <em>Voltex</em>, vs the rest.
              </h2>
            </div>
            <p className="max-w-md text-[14px] leading-[1.7]" style={{ color: SUB }}>
              Compared with the apps people usually leave to come build a real second brain.
            </p>
          </div>

          <div
            className="mt-12 overflow-hidden rounded-2xl border"
            style={{ borderColor: LINE_STRONG, background: CARD }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${LINE_STRONG}` }}>
                    <th className="w-[36%] px-6 py-5 text-left">
                      <MonoLabel>Capability</MonoLabel>
                    </th>
                    {[
                      { name: "Voltex", italic: true, accent: true },
                      { name: "Obsidian" },
                      { name: "Notion" },
                      { name: "Evernote" },
                    ].map((p) => (
                      <th key={p.name} className="px-6 py-5 text-left">
                        <span
                          className="text-[18px] md:text-[20px]"
                          style={{
                            ...SERIF,
                            fontWeight: 500,
                            fontStyle: p.italic ? "italic" : "normal",
                            color: p.accent ? VIOLET : INK,
                          }}
                        >
                          {p.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr
                      key={r.feature}
                      className="vx-row"
                      style={{ borderBottom: i < ROWS.length - 1 ? `1px solid ${LINE}` : "none" }}
                    >
                      <td className="px-6 py-4 text-[14px]" style={{ color: INK }}>
                        {r.feature}
                      </td>
                      <Cell val={r.voltex} accent />
                      <Cell val={r.obsidian} />
                      <Cell val={r.notion} />
                      <Cell val={r.evernote} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-[12px]" style={{ ...MONO, color: DIM }}>
            * Comparisons reflect publicly advertised features as of 2026. We may have missed something — open a PR.
          </p>
        </div>
      </section>

      {/* ── Download ────────────────────────────────────────────────────── */}
      <section id="download" className="relative z-10 overflow-hidden border-b" style={{ borderColor: LINE }}>
        {/* background flourish */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 80% 20%, rgba(167,139,250,0.18), transparent 60%), radial-gradient(ellipse 40% 60% at 10% 80%, rgba(34,211,238,0.12), transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-36">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <ChapterTag n="05" label="Get started" />
              <h2
                className="mt-6 text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[64px]"
                style={{ ...SERIF, fontWeight: 500 }}
              >
                <em>Ready</em> when<br />
                you are.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.7]" style={{ color: SUB }}>
                Free forever. No account required for local vaults. Sign in only when you want sync
                across devices.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/notes"
                  className="vx-cta-primary inline-flex h-12 items-center gap-2 rounded-full px-6 text-[12px] uppercase tracking-[0.2em]"
                  style={{ ...MONO, background: VIOLET, color: "#0b0610" }}
                >
                  Open the web app <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/Dev-Lune/voltex-notes"
                  target="_blank"
                  rel="noreferrer"
                  className="vx-cta-ghost inline-flex h-12 items-center gap-2 rounded-full border px-6 text-[12px] uppercase tracking-[0.2em]"
                  style={{ ...MONO, borderColor: LINE_STRONG, color: INK }}
                >
                  <Github className="h-4 w-4" /> Star on Github
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <MonoLabel>desktop builds — v1.3.0</MonoLabel>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DOWNLOADS.map((d) => {
                  const Inner = (
                    <>
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            background: d.soon ? "rgba(244,240,230,0.06)" : "rgba(167,139,250,0.12)",
                            color: d.soon ? SUB : VIOLET,
                          }}
                        >
                          <d.icon className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <div>
                          <div
                            className="flex items-center gap-2 text-[18px] leading-none"
                            style={{ ...SERIF, fontWeight: 500, color: INK }}
                          >
                            <span style={{ fontStyle: "italic" }}>{d.label}</span>
                            {d.soon && (
                              <span
                                className="rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.22em]"
                                style={{ ...MONO, borderColor: LINE_STRONG, color: DIM }}
                              >
                                soon
                              </span>
                            )}
                          </div>
                          <div
                            className="mt-1.5 text-[10px] uppercase tracking-[0.18em]"
                            style={{ ...MONO, color: DIM }}
                          >
                            {d.hint}
                          </div>
                        </div>
                      </div>
                      {!d.soon && (
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          style={{ color: SUB }}
                        />
                      )}
                    </>
                  );
                  return (
                    <li key={d.label}>
                      {d.href ? (
                        <a
                          href={d.href}
                          target={d.href.startsWith("http") ? "_blank" : undefined}
                          rel={d.href.startsWith("http") ? "noreferrer" : undefined}
                          className="vx-card group flex items-center justify-between rounded-xl border px-5 py-5"
                          style={{ borderColor: LINE_STRONG, background: CARD }}
                        >
                          {Inner}
                        </a>
                      ) : (
                        <div
                          className="flex cursor-not-allowed items-center justify-between rounded-xl border px-5 py-5 opacity-70"
                          style={{ borderColor: LINE, background: CARD }}
                        >
                          {Inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10" style={{ background: BG }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:px-10">
          <div className="md:col-span-5">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="text-3xl italic leading-none" style={{ ...SERIF, color: INK }}>
                voltex
              </span>
              <span className="text-3xl italic leading-none" style={{ ...SERIF, color: VIOLET }}>
                /
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-[14px] leading-[1.7]" style={{ color: SUB }}>
              An open-source knowledge base for people who think in links. Built with care by{" "}
              <a
                href="https://devlune.in"
                target="_blank"
                rel="noreferrer"
                className="vx-link"
                style={{ color: INK }}
              >
                DevLune Studios
              </a>
              .
            </p>
          </div>

          {[
            {
              h: "Product",
              items: [
                { l: "Web app", href: "/notes" },
                { l: "Capabilities", href: "#capabilities" },
                { l: "Download", href: "#download" },
                { l: "Compare", href: "#compare" },
              ],
            },
            {
              h: "Open source",
              items: [
                { l: "Github", href: "https://github.com/Dev-Lune/voltex-notes" },
                { l: "Issues", href: "https://github.com/Dev-Lune/voltex-notes/issues" },
                { l: "Changelog", href: "/CHANGELOG" },
                { l: "License — MIT", href: "/LICENSE" },
              ],
            },
            {
              h: "Studio",
              items: [
                { l: "DevLune", href: "https://devlune.in" },
                { l: "Twitter", href: "#" },
                { l: "Contact", href: "mailto:hello@devlune.in" },
              ],
            },
          ].map((col) => (
            <div key={col.h} className="md:col-span-2">
              <MonoLabel>{col.h}</MonoLabel>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((it) => (
                  <li key={it.l}>
                    <a href={it.href} className="vx-link text-[13px]" style={{ color: SUB }}>
                      {it.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-1 md:text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: DIM }}>
              v1.3.0
            </span>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: LINE }}>
          <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-6 py-6 md:flex-row md:px-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: DIM }}>
              © 2026 DevLune Studios — All rights — none watching
            </span>
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: VIOLET, animation: "vx-blink 2s ease-in-out infinite" }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: SUB }}>
                shipped offline-first
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── small inline visuals ────────────────────────────────────────────────── */

function Cell({ val, accent }: { val: boolean | string; accent?: boolean }) {
  if (val === true) {
    return (
      <td className="px-6 py-4">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: accent ? "rgba(167,139,250,0.15)" : "rgba(244,240,230,0.06)",
            color: accent ? VIOLET : INK,
          }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      </td>
    );
  }
  if (val === false) {
    return (
      <td className="px-6 py-4">
        <Minus className="h-4 w-4" style={{ color: DIM }} />
      </td>
    );
  }
  return (
    <td className="px-6 py-4">
      <span
        className="text-[13px]"
        style={{
          ...MONO,
          color: accent ? VIOLET : SUB,
        }}
      >
        {val}
      </span>
    </td>
  );
}

function BigGraph() {
  // Live force-directed graph for the Graph view card. Real spring + repulsion
  // simulation, gentle ambient drift, hover lights up neighborhood.
  type N = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    c: string;
    label?: string;
    pinned?: boolean;
  };

  const W = 200;
  const H = 200;
  const CX = W / 2;
  const CY = H / 2;

  const initial: N[] = [
    { id: 0, x: CX, y: CY, vx: 0, vy: 0, r: 11, c: VIOLET, label: "MOC", pinned: true },
    { id: 1, x: 38, y: 44, vx: 0, vy: 0, r: 6, c: INK, label: "ideas" },
    { id: 2, x: 162, y: 50, vx: 0, vy: 0, r: 7, c: CYAN, label: "specs" },
    { id: 3, x: 172, y: 132, vx: 0, vy: 0, r: 5, c: INK, label: "daily" },
    { id: 4, x: 32, y: 150, vx: 0, vy: 0, r: 6, c: VIOLET, label: "refs" },
    { id: 5, x: 78, y: 28, vx: 0, vy: 0, r: 4, c: CYAN, label: "todo" },
    { id: 6, x: 142, y: 168, vx: 0, vy: 0, r: 5, c: INK, label: "drafts" },
    { id: 7, x: 60, y: 168, vx: 0, vy: 0, r: 4, c: CYAN },
    { id: 8, x: 170, y: 92, vx: 0, vy: 0, r: 4, c: VIOLET },
    { id: 9, x: 22, y: 96, vx: 0, vy: 0, r: 4, c: INK },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 8], [0, 9],
    [1, 5], [1, 9], [2, 5], [2, 8],
    [4, 7], [4, 9], [3, 6], [6, 7], [6, 0],
  ];
  const REST = 46; // ideal spring length
  const SPRING = 0.012;
  const REPEL = 110;
  const CENTER = 0.004;
  const DAMP = 0.86;

  const nodesRef = useRef<N[]>(initial.map((n) => ({ ...n })));
  const [, setFrame] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  hoverRef.current = hover;
  const draggingRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // adjacency for "lights up neighborhood"
  const neighbors = (() => {
    const m = new Map<number, Set<number>>();
    initial.forEach((n) => m.set(n.id, new Set()));
    edges.forEach(([a, b]) => {
      m.get(a)!.add(b);
      m.get(b)!.add(a);
    });
    return m;
  })();

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      const ns = nodesRef.current;
      // repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i];
          const b = ns[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 0.01;
          }
          const f = REPEL / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      // springs
      for (const [a, b] of edges) {
        const na = ns[a];
        const nb = ns[b];
        const dx = nb.x - na.x;
        const dy = nb.y - na.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - REST) * SPRING;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        na.vx += fx;
        na.vy += fy;
        nb.vx -= fx;
        nb.vy -= fy;
      }
      // gentle pull to center + ambient drift
      t += 0.02;
      for (const n of ns) {
        n.vx += (CX - n.x) * CENTER;
        n.vy += (CY - n.y) * CENTER;
        // ambient breathing
        n.vx += Math.sin(t * 0.7 + n.id) * 0.04;
        n.vy += Math.cos(t * 0.5 + n.id * 1.3) * 0.04;

        n.vx *= DAMP;
        n.vy *= DAMP;

        if (n.pinned || draggingRef.current === n.id) continue;

        n.x += n.vx;
        n.y += n.vy;

        // soft walls
        const pad = n.r + 4;
        if (n.x < pad) {
          n.x = pad;
          n.vx *= -0.4;
        }
        if (n.x > W - pad) {
          n.x = W - pad;
          n.vx *= -0.4;
        }
        if (n.y < pad) {
          n.y = pad;
          n.vy *= -0.4;
        }
        if (n.y > H - pad) {
          n.y = H - pad;
          n.vy *= -0.4;
        }
      }
      setFrame((f) => (f + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pointer drag
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const ns = nodesRef.current;
  const isLit = (id: number): boolean => {
    if (hover === null) return false;
    if (hover === id) return true;
    return neighbors.get(hover)?.has(id) ?? false;
  };
  const edgeLit = (a: number, b: number): boolean =>
    hover !== null && (hover === a || hover === b);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: draggingRef.current !== null ? "grabbing" : "default" }}
      onPointerMove={(e) => {
        if (draggingRef.current === null) return;
        const p = toSvg(e);
        const n = ns.find((x) => x.id === draggingRef.current);
        if (n && !n.pinned) {
          n.x = p.x;
          n.y = p.y;
          n.vx = 0;
          n.vy = 0;
        }
      }}
      onPointerUp={() => {
        draggingRef.current = null;
      }}
      onPointerLeave={() => {
        draggingRef.current = null;
        setHover(null);
      }}
    >
      <defs>
        <radialGradient id="bg-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={VIOLET} stopOpacity="0.45" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
        <pattern id="bg-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="rgba(244,240,230,0.18)" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="url(#bg-dots)" opacity="0.4" />
      <circle cx={CX} cy={CY} r="60" fill="url(#bg-core)" />

      {/* edges */}
      {edges.map(([a, b], i) => {
        const na = ns[a];
        const nb = ns[b];
        const lit = edgeLit(a, b);
        const dim = hover !== null && !lit;
        const baseStroke = i % 3 === 0 ? VIOLET : i % 3 === 1 ? CYAN : INK;
        return (
          <line
            key={`e-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={lit ? VIOLET : baseStroke}
            strokeOpacity={lit ? 0.85 : dim ? 0.08 : 0.32}
            strokeWidth={lit ? 1.2 : 0.7}
            style={{ transition: "stroke-opacity 0.2s, stroke-width 0.2s" }}
          />
        );
      })}

      {/* nodes */}
      {ns.map((n) => {
        const lit = isLit(n.id);
        const dim = hover !== null && !lit;
        return (
          <g
            key={`n-${n.id}`}
            style={{ cursor: n.pinned ? "default" : "grab" }}
            onPointerEnter={() => setHover(n.id)}
            onPointerLeave={() => setHover(null)}
            onPointerDown={(e) => {
              if (n.pinned) return;
              draggingRef.current = n.id;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r + 4}
              fill="none"
              stroke={n.c}
              strokeOpacity={lit ? 0.55 : dim ? 0.08 : 0.22}
              strokeWidth="0.6"
              style={{ transition: "stroke-opacity 0.2s" }}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.c}
              fillOpacity={lit ? 1 : dim ? 0.25 : n.c === INK ? 0.55 : 0.9}
              style={{ transition: "fill-opacity 0.2s" }}
            />
            {n.label && (
              <text
                x={n.x}
                y={n.y + n.r + 8}
                textAnchor="middle"
                fontSize="6"
                letterSpacing="0.8"
                fill={lit ? INK : dim ? "rgba(244,240,230,0.25)" : "rgba(244,240,230,0.7)"}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  transition: "fill 0.2s",
                  pointerEvents: "none",
                }}
              >
                {n.label}
              </text>
            )}
            {/* invisible bigger hit area */}
            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

function BacklinksDemo() {
  const items = [
    { title: "Daily — 04/18", line: "...met w/ [[ana]] re: graph spec..." },
    { title: "Spec / Linker", line: "depends on [[graph-spec]] performance." },
    { title: "MOC / Engineering", line: "see [[graph-spec]] for v1 plan." },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full" style={{ background: VIOLET }} />
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ ...MONO, color: DIM }}>
          3 backlinks · graph-spec
        </span>
      </div>
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-md border px-3 py-2"
          style={{ borderColor: LINE, background: BG }}
        >
          <div className="text-[11px]" style={{ ...MONO, color: VIOLET }}>{it.title}</div>
          <div className="mt-1 truncate text-[11px]" style={{ color: SUB }}>{it.line}</div>
        </div>
      ))}
    </div>
  );
}

function VersionTimeline() {
  const dots = [
    { t: "12:04", label: "now", live: true },
    { t: "11:50", label: "+14m" },
    { t: "11:22", label: "+42m" },
    { t: "10:48", label: "+1h 16m" },
    { t: "Yesterday", label: "yday" },
  ];
  return (
    <div className="relative">
      <div className="absolute left-1.5 top-2 bottom-2 w-px" style={{ background: LINE_STRONG }} />
      <ul className="space-y-2.5">
        {dots.map((d) => (
          <li key={d.t} className="flex items-center gap-3">
            <span
              className="relative z-10 h-3 w-3 rounded-full ring-4"
              style={{
                background: d.live ? CYAN : INK,
                opacity: d.live ? 1 : 0.4,
                boxShadow: `0 0 0 4px ${CARD}`,
              }}
            />
            <span className="text-[11px]" style={{ ...MONO, color: d.live ? INK : SUB }}>{d.t}</span>
            <span className="ml-auto text-[10px]" style={{ ...MONO, color: DIM }}>{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyncStrip() {
  return (
    <div className="space-y-2.5">
      {[
        { dev: "macbook · local", t: "0.00s", c: VIOLET },
        { dev: "cloud · firestore", t: "0.18s", c: CYAN },
        { dev: "iphone · web", t: "0.42s", c: INK },
      ].map((r) => (
        <div
          key={r.dev}
          className="flex items-center justify-between rounded-md px-3 py-2"
          style={{ background: BG, border: `1px solid ${LINE}` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: r.c, animation: "vx-blink 1.6s ease-in-out infinite" }}
            />
            <span className="text-[11px]" style={{ ...MONO, color: SUB }}>{r.dev}</span>
          </div>
          <span className="text-[11px] tabular-nums" style={{ ...MONO, color: r.c }}>+{r.t}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Pet companion live demo ────────────────────────────────────────────── */

function PetCompanionDemoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<PetType>("cat");

  const PETS: { id: PetType; emoji: string; label: string }[] = [
    { id: "cat", emoji: "🐱", label: "Cat" },
    { id: "fox", emoji: "🦊", label: "Fox" },
    { id: "dragon", emoji: "🐉", label: "Dragon" },
    { id: "ghost", emoji: "👻", label: "Ghost" },
    { id: "alien", emoji: "👽", label: "Alien" },
    { id: "axolotl", emoji: "🦎", label: "Axolotl" },
  ];

  return (
    <section className="relative z-10 border-b" style={{ borderColor: LINE, background: SURF }}>
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <ChapterTag n="01.5" label="A friend in your vault" />
            <h2 className="mt-5 text-4xl leading-[1.05] tracking-tight md:text-5xl" style={{ ...SERIF, color: INK }}>
              Meet your <em style={{ color: VIOLET, fontStyle: "italic" }}>companion</em>.
            </h2>
            <p className="mt-5 max-w-prose text-base leading-relaxed" style={{ color: SUB }}>
              A small, intelligent creature that lives in your editor. It chases your cursor,
              jumps when you click, walks over to inspect headings and links, and lets itself be
              dragged anywhere. Six characters. Six personalities. One toggle to turn off.
            </p>
            <ul className="mt-6 space-y-2 text-sm" style={{ color: SUB }}>
              {[
                "Aware of your headings, links and images.",
                "Reacts to clicks, drags, and idle time.",
                "Off by default — a single switch in Settings → Companion.",
                "Desktop & web only. Out of your way on mobile.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: VIOLET }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              {PETS.map((p) => {
                const isActive = active === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    aria-pressed={isActive}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      borderColor: isActive ? VIOLET : LINE_STRONG,
                      background: isActive ? "rgba(167,139,250,0.12)" : "transparent",
                      color: isActive ? VIOLET : INK,
                    }}
                  >
                    <span aria-hidden>{p.emoji}</span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-2xl"
              style={{
                aspectRatio: "16 / 11",
                background: BG,
                border: `1px solid ${LINE_STRONG}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Faux notebook background */}
              <div className="pointer-events-none absolute inset-0 p-6 md:p-8">
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-[0.22em]" style={{ ...MONO, color: DIM }}>
                    untitled.md
                  </div>
                  <h3 className="text-2xl md:text-3xl tracking-tight" style={{ ...SERIF, color: INK }}>
                    Reading notes — late autumn
                  </h3>
                  <div className="h-px w-12" style={{ background: LINE_STRONG }} />
                  <p className="max-w-prose text-sm leading-relaxed" style={{ color: SUB }}>
                    Wikilinks form the spine of a vault. Each <span style={{ color: CYAN }}>[[backlink]]</span> is
                    a tiny invitation. Click anywhere on this card to make your companion leap.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm" style={{ color: SUB }}>
                    <li className="flex items-center gap-2"><span style={{ color: VIOLET }}>§</span> Drag the creature anywhere.</li>
                    <li className="flex items-center gap-2"><span style={{ color: VIOLET }}>§</span> Move the cursor near it — watch it chase.</li>
                    <li className="flex items-center gap-2"><span style={{ color: VIOLET }}>§</span> Wait. It will explore on its own.</li>
                  </ul>
                </div>
                <div
                  className="absolute right-5 bottom-4 text-[10px]"
                  style={{ ...MONO, color: DIM }}
                >
                  live · {active}
                </div>
              </div>

              {/* The actual pet, scoped to this card */}
              <PetCompanion
                key={active}
                type={active}
                containerRef={containerRef}
                enabled
                zIndex={5}
              />
            </div>
            <p className="mt-3 text-[11px]" style={{ ...MONO, color: DIM }}>
              Yes — it&apos;s the real component. Same one that ships in the app.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

