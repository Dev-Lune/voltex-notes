"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Network, Cloud, History, Puzzle, Palette,
  PenTool, Columns3, Terminal, Download, Globe, ArrowRight,
  Check, X, Github, Zap, Shield, Star, Sparkles, Link2,
  Search, Share2, ChevronDown, Monitor, Smartphone, Menu,
  X as XIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Design tokens
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  bg: "#fdfbf7",
  fg: "#2d2d2d",
  muted: "#e5e0d8",
  accent: "#ff4d4d",
  border: "#2d2d2d",
  blue: "#2d5da1",
  postIt: "#fff9c4",
  white: "#ffffff",
};

const WOBBLY = "255px 15px 225px 15px / 15px 225px 15px 255px";
const WOBBLY_MD = "15px 255px 15px 225px / 225px 15px 255px 15px";
const WOBBLY_SM = "20px 8px 20px 12px / 10px 18px 12px 20px";
const SHADOW = `4px 4px 0px 0px ${C.border}`;
const SHADOW_LG = `8px 8px 0px 0px ${C.border}`;
const SHADOW_SM = `2px 2px 0px 0px ${C.border}`;
const SHADOW_SUBTLE = `3px 3px 0px 0px rgba(45,45,45,0.1)`;

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal();
  useEffect(() => {
    if (!visible) return;
    let frame: number;
    const duration = 1400;
    const start = performance.now();
    function animate(now: number) {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function VoltexGem({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.45} viewBox="0 0 80 116" fill="none">
      <polygon points="0,26 66,19 33,54" fill="#40C4FF" />
      <polygon points="0,26 33,54 33,112 0,68" fill="#0B3F7A" />
      <polygon points="66,19 76,68 33,112 33,54" fill="#1565C0" />
      <line x1="0" y1="26" x2="33" y2="54" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <line x1="66" y1="19" x2="33" y2="54" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <line x1="33" y1="54" x2="33" y2="112" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      <polygon points="0,26 66,19 76,68 33,112 0,68" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <path
        d="M39 0 L27 0 L19 17 L28 17 L20 40 L46 40 L50 17 L39 17 Z"
        fill="#FFD600" stroke="rgba(255,220,0,0.35)" strokeWidth="1.2" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: FileText, title: "Markdown Editor",     desc: "Live preview, syntax highlighting, smart lists. Pure distraction-free writing.", tag: "Core" },
  { icon: Network,  title: "Knowledge Graph",     desc: "Force-directed interactive graph with bidirectional [[wikilinks]] and hover previews.", tag: "Core" },
  { icon: Cloud,    title: "Real-time Sync",       desc: "Instant cloud sync via Firebase. Offline-first with automatic conflict resolution.", tag: "Core" },
  { icon: Link2,    title: "Bidirectional Links",  desc: "[[Wikilinks]] that work both ways. See all backlinks in the side panel." },
  { icon: History,  title: "Version History",      desc: "Every edit tracked with inline diffs. One-click rollback to any point." },
  { icon: Puzzle,   title: "Plugin Ecosystem",     desc: "13+ plugins — Excalidraw, Kanban, AI assistant, Git sync, and more." },
  { icon: Palette,  title: "Themeable",            desc: "10+ built-in themes, plus a live custom theme editor." },
  { icon: PenTool,  title: "Canvas & Drawing",     desc: "Excalidraw integration for sketches, diagrams, and spatial thinking." },
  { icon: Columns3, title: "Kanban Boards",        desc: "Drag-and-drop task boards built right into your vault." },
  { icon: Search,   title: "Advanced Search",      desc: "Operators like tag:, path:, type:, has: — find anything." },
  { icon: Terminal, title: "Command Palette",      desc: "Ctrl+P fuzzy search for every action. Power-user paradise." },
  { icon: Share2,   title: "Public Sharing",       desc: "One-click shareable links for any note. Clean read-only viewer." },
];

const comparison = [
  { feature: "Open Source",         voltex: true,    obsidian: false,    notion: false, logseq: true  },
  { feature: "Free Cloud Sync",     voltex: true,    obsidian: false,    notion: true,  logseq: false },
  { feature: "Graph View",          voltex: true,    obsidian: true,     notion: false, logseq: true  },
  { feature: "Markdown Native",     voltex: true,    obsidian: true,     notion: false, logseq: true  },
  { feature: "Version History",     voltex: true,    obsidian: true,     notion: true,  logseq: false },
  { feature: "Plugin Ecosystem",    voltex: true,    obsidian: true,     notion: false, logseq: true  },
  { feature: "Canvas / Whiteboard", voltex: true,    obsidian: true,     notion: false, logseq: true  },
  { feature: "Desktop App",         voltex: true,    obsidian: true,     notion: true,  logseq: true  },
  { feature: "Web App",             voltex: true,    obsidian: false,    notion: true,  logseq: false },
  { feature: "Real-time Collab",    voltex: "Soon",  obsidian: false,    notion: true,  logseq: false },
  { feature: "Custom Themes",       voltex: true,    obsidian: true,     notion: false, logseq: true  },
  { feature: "Kanban Boards",       voltex: true,    obsidian: "Plugin", notion: true,  logseq: false },
];

const stats = [
  { label: "Features",        value: 50,  suffix: "+" },
  { label: "Built-in Themes", value: 10,  suffix: "+" },
  { label: "Plugins",         value: 13,  suffix: "+" },
  { label: "Open Source",     value: 100, suffix: "%" },
];

const howItWorks = [
  { step: "1", title: "Open the app", desc: "Download for Windows or use the web version. No sign-up needed." },
  { step: "2", title: "Write in Markdown", desc: "Create notes with live preview, [[wikilinks]], and smart formatting." },
  { step: "3", title: "Connect ideas", desc: "Link notes together and watch your knowledge graph grow organically." },
];

function CellVal({ val }: { val: boolean | string }) {
  if (val === true)  return <Check size={16} strokeWidth={3} className="mx-auto" style={{ color: C.blue }} />;
  if (val === false) return <X size={16} strokeWidth={3} className="mx-auto" style={{ color: C.muted }} />;
  return <span className="text-xs font-medium" style={{ color: C.fg, fontFamily: "'Patrick Hand', cursive" }}>{val}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: C.bg,
        color: C.fg,
        fontFamily: "'Patrick Hand', cursive",
        backgroundImage: `radial-gradient(${C.muted} 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Patrick+Hand&display=swap"
        rel="stylesheet"
      />

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b-2" : ""}`}
        style={{
          background: scrolled ? C.bg : "transparent",
          borderColor: scrolled ? C.border : "transparent",
          fontFamily: "'Patrick Hand', cursive",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <VoltexGem size={26} />
            <span
              className="font-bold text-xl tracking-wide"
              style={{ fontFamily: "'Kalam', cursive", color: C.fg }}
            >
              Volt<span style={{ color: C.accent }}>ex</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[["#features", "Features"], ["#comparison", "Compare"], ["#how-it-works", "How It Works"], ["#download", "Download"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-base hover:underline decoration-wavy decoration-2 underline-offset-4 transition-all duration-100"
                style={{ color: C.fg, textDecorationColor: C.accent }}
              >
                {label}
              </a>
            ))}
            <a
              href="https://github.com/Dev-Lune/voltex-notes"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-base transition-colors"
              style={{ color: C.fg }}
            >
              <Github size={16} strokeWidth={2.5} /> Star
            </a>
            <Link
              href="/notes"
              className="flex items-center gap-1.5 px-5 py-2 border-[3px] text-base font-bold transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
              style={{
                borderRadius: WOBBLY_SM,
                borderColor: C.border,
                background: C.white,
                color: C.fg,
                boxShadow: SHADOW,
                fontFamily: "'Patrick Hand', cursive",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.accent;
                e.currentTarget.style.color = C.white;
                e.currentTarget.style.boxShadow = SHADOW_SM;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.color = C.fg;
                e.currentTarget.style.boxShadow = SHADOW;
              }}
            >
              Open App <ArrowRight size={14} />
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
            style={{ color: C.fg }}
          >
            {mobileMenuOpen ? <XIcon size={22} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="md:hidden px-6 py-5 flex flex-col gap-4 border-t-2"
            style={{ background: C.bg, borderColor: C.border }}
          >
            {[["#features", "Features"], ["#comparison", "Compare"], ["#how-it-works", "How It Works"], ["#download", "Download"]].map(([href, label]) => (
              <a key={href} href={href} onClick={closeMenu} className="text-lg" style={{ color: C.fg }}>
                {label}
              </a>
            ))}
            <a href="https://github.com/Dev-Lune/voltex-notes" target="_blank" rel="noopener noreferrer" className="text-lg" style={{ color: C.fg }}>
              GitHub
            </a>
            <Link
              href="/notes"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 px-5 py-3 border-[3px] text-lg font-bold"
              style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.accent, color: C.white, boxShadow: SHADOW }}
            >
              Open App <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">

        {/* Decorative bouncing circle — desktop only */}
        <div
          className="hidden md:block absolute top-32 right-[12%] w-16 h-16 border-[3px] border-dashed animate-bounce"
          style={{
            borderColor: C.accent,
            borderRadius: "50% 45% 55% 40% / 40% 55% 45% 50%",
            animationDuration: "3s",
          }}
        />

        {/* Gem */}
        <div className="mb-6 rotate-[-2deg]">
          <VoltexGem size={96} />
        </div>

        {/* Badge */}
        <div
          className="flex items-center gap-2 px-5 py-2 border-2 text-sm font-bold mb-8 rotate-[1deg]"
          style={{
            borderRadius: WOBBLY_SM,
            borderColor: C.border,
            background: C.postIt,
            color: C.fg,
            boxShadow: SHADOW_SM,
          }}
        >
          <Sparkles size={14} strokeWidth={2.5} />
          Open Source · Free Forever
        </div>

        {/* Heading */}
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-center max-w-4xl mb-6 leading-tight"
          style={{ fontFamily: "'Kalam', cursive", color: C.fg }}
        >
          Your second brain,
          <br />
          <span className="relative inline-block">
            <span style={{ color: C.accent }}>supercharged</span>
            <span className="inline-block rotate-12 ml-2 text-3xl md:text-4xl" style={{ color: C.accent }}>!</span>
            {/* Hand-drawn underline */}
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
              <path d="M2 8 Q75 2 150 7 T298 5" stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl text-center max-w-2xl mb-10 leading-relaxed"
          style={{ color: C.fg }}
        >
          The open-source knowledge base with graph view, real-time cloud sync,
          bidirectional linking, version history, and a full plugin ecosystem —
          <span className="underline decoration-wavy decoration-2 underline-offset-4" style={{ textDecorationColor: C.blue }}> built for connected thinkers.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
          <a
            href="#download"
            className="flex items-center gap-2 px-7 py-3.5 border-[3px] text-lg md:text-xl font-bold transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            style={{
              borderRadius: WOBBLY,
              borderColor: C.border,
              background: C.accent,
              color: C.white,
              boxShadow: SHADOW_LG,
              fontFamily: "'Patrick Hand', cursive",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW_LG; }}
          >
            <Download size={18} strokeWidth={2.5} /> Download for Windows
          </a>
          <Link
            href="/notes"
            className="flex items-center gap-2 px-7 py-3.5 border-[3px] text-lg md:text-xl font-bold transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            style={{
              borderRadius: WOBBLY,
              borderColor: C.border,
              background: C.white,
              color: C.fg,
              boxShadow: SHADOW_LG,
              fontFamily: "'Patrick Hand', cursive",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.blue;
              e.currentTarget.style.color = C.white;
              e.currentTarget.style.boxShadow = SHADOW;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = C.white;
              e.currentTarget.style.color = C.fg;
              e.currentTarget.style.boxShadow = SHADOW_LG;
            }}
          >
            <Globe size={18} strokeWidth={2.5} /> Use Web Version
          </Link>
        </div>

        {/* Hand-drawn arrow pointing to CTA — desktop only */}
        <div className="hidden md:block absolute bottom-[22%] left-[55%]">
          <svg width="80" height="50" viewBox="0 0 80 50" fill="none">
            <path d="M2 48 Q20 10 60 8" stroke={C.fg} strokeWidth="2" strokeDasharray="4 4" fill="none" strokeLinecap="round" />
            <path d="M55 2 L62 8 L54 14" stroke={C.fg} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Trust pills */}
        <div className="flex items-center gap-5 flex-wrap justify-center">
          {([
            [Zap, "No account required"],
            [Shield, "Works offline"],
            [Star, "Your data stays yours"],
          ] as const).map(([Icon, label]) => (
            <div key={label} className="flex items-center gap-1.5 text-sm" style={{ color: C.fg }}>
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ color: C.fg, animationDuration: "2s" }}>
          <ChevronDown size={24} strokeWidth={2.5} />
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div
                className="text-center p-6 border-2 transition-transform duration-100 hover:rotate-1"
                style={{
                  borderRadius: [
                    "50% 45% 55% 40% / 40% 55% 45% 50%",
                    "45% 55% 40% 50% / 50% 40% 55% 45%",
                    "55% 40% 50% 45% / 45% 50% 40% 55%",
                    "40% 50% 45% 55% / 55% 45% 50% 40%",
                  ][i % 4],
                  borderColor: C.border,
                  background: C.white,
                  boxShadow: SHADOW,
                }}
              >
                <div
                  className="text-4xl md:text-5xl font-bold leading-none mb-1"
                  style={{ fontFamily: "'Kalam', cursive", color: C.accent }}
                >
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm tracking-widest uppercase" style={{ color: C.fg }}>
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <div
              className="inline-block px-4 py-1 border-2 text-sm font-bold mb-4 rotate-[-1deg]"
              style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.postIt, boxShadow: SHADOW_SM }}
            >
              Features
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Kalam', cursive" }}
            >
              Everything you need to{" "}
              <span className="relative inline-block">
                <span style={{ color: C.accent }}>think better</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                  <path d="M2 5 Q50 1 100 5 T198 4" stroke={C.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.fg }}>
              All the power of enterprise tools — none of the lock-in.
            </p>
          </Reveal>

          {/* Hero feature cards — 3 across */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {features.slice(0, 3).map((f, i) => {
              const decorations = ["tape", "tack", "none"] as const;
              const dec = decorations[i];
              const rotations = ["rotate-[-1deg]", "rotate-[1deg]", "rotate-[-0.5deg]"];
              return (
                <Reveal key={f.title} delay={i * 80} className={rotations[i]}>
                  <div
                    className="relative p-6 md:p-8 border-2 h-full transition-transform duration-100 hover:rotate-[1deg]"
                    style={{
                      borderRadius: WOBBLY_MD,
                      borderColor: C.border,
                      background: C.white,
                      boxShadow: SHADOW,
                    }}
                  >
                    {/* Tape decoration */}
                    {dec === "tape" && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 rotate-[2deg]"
                        style={{ background: "rgba(200,200,190,0.5)", borderRadius: "2px" }}
                      />
                    )}
                    {/* Tack decoration */}
                    {dec === "tack" && (
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 border-2 z-10"
                        style={{
                          borderRadius: "50%",
                          background: C.accent,
                          borderColor: C.border,
                          boxShadow: `1px 1px 0px 0px ${C.border}`,
                        }}
                      />
                    )}
                    {/* Tag */}
                    {f.tag && (
                      <div
                        className="inline-block px-3 py-0.5 border-2 text-xs font-bold mb-4 rotate-[-1deg]"
                        style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.postIt }}
                      >
                        {f.tag}
                      </div>
                    )}
                    <div
                      className="w-12 h-12 flex items-center justify-center border-2 mb-4"
                      style={{
                        borderRadius: "50% 45% 55% 40% / 40% 55% 45% 50%",
                        borderColor: C.border,
                        background: `${C.accent}12`,
                      }}
                    >
                      <f.icon size={22} strokeWidth={2.5} style={{ color: C.accent }} />
                    </div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ fontFamily: "'Kalam', cursive" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-base leading-relaxed" style={{ color: C.fg }}>
                      {f.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Remaining features — compact grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.slice(3).map((f, i) => (
              <Reveal key={f.title} delay={200 + i * 40}>
                <div
                  className="flex gap-4 p-5 border-2 h-full transition-transform duration-100 hover:rotate-[-1deg]"
                  style={{
                    borderRadius: WOBBLY_SM,
                    borderColor: C.border,
                    background: C.white,
                    boxShadow: SHADOW_SUBTLE,
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0 border-2"
                    style={{
                      borderRadius: "45% 55% 40% 50% / 50% 40% 55% 45%",
                      borderColor: C.border,
                      background: `${C.blue}10`,
                    }}
                  >
                    <f.icon size={18} strokeWidth={2.5} style={{ color: C.blue }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-0.5" style={{ fontFamily: "'Kalam', cursive" }}>
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: C.fg }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <div
              className="inline-block px-4 py-1 border-2 text-sm font-bold mb-4 rotate-[1deg]"
              style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.postIt, boxShadow: SHADOW_SM }}
            >
              How It Works
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Kalam', cursive" }}
            >
              Three simple{" "}
              <span style={{ color: C.blue }}>steps</span>
            </h2>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Squiggly connecting line — desktop */}
            <svg className="hidden md:block absolute top-[40px] left-[20%] w-[60%] h-8" viewBox="0 0 600 30" fill="none" preserveAspectRatio="none">
              <path d="M0 15 Q50 0 100 15 T200 15 T300 15 T400 15 T500 15 T600 15" stroke={C.fg} strokeWidth="2" strokeDasharray="8 6" fill="none" />
            </svg>

            {howItWorks.map((step, i) => {
              const rotations = ["-rotate-1", "rotate-[1.5deg]", "-rotate-[0.5deg]"];
              return (
                <Reveal key={step.step} delay={i * 100} className={rotations[i]}>
                  <div
                    className="relative p-6 border-2 text-center h-full"
                    style={{
                      borderRadius: WOBBLY_MD,
                      borderColor: C.border,
                      background: C.white,
                      boxShadow: SHADOW,
                    }}
                  >
                    <div
                      className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center border-[3px] text-xl font-bold z-10"
                      style={{
                        borderRadius: "50% 45% 55% 40% / 40% 55% 45% 50%",
                        borderColor: C.border,
                        background: C.accent,
                        color: C.white,
                        fontFamily: "'Kalam', cursive",
                        boxShadow: SHADOW_SM,
                      }}
                    >
                      {step.step}
                    </div>
                    <h3
                      className="text-xl font-bold mt-4 mb-2"
                      style={{ fontFamily: "'Kalam', cursive" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-base leading-relaxed" style={{ color: C.fg }}>
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ───────────────────────────────────────────── */}
      <section id="comparison" className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <div
              className="inline-block px-4 py-1 border-2 text-sm font-bold mb-4 rotate-[-1deg]"
              style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.postIt, boxShadow: SHADOW_SM }}
            >
              Compare
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Kalam', cursive" }}
            >
              How Voltex{" "}
              <span style={{ color: C.accent }}>compares</span>
            </h2>
            <p className="text-lg" style={{ color: C.fg }}>
              See how we stack up against other popular knowledge tools.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div
              className="border-[3px] overflow-hidden"
              style={{
                borderRadius: WOBBLY_MD,
                borderColor: C.border,
                background: C.white,
                boxShadow: SHADOW_LG,
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontFamily: "'Patrick Hand', cursive" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      <th
                        className="text-left py-4 px-5 text-sm tracking-widest uppercase font-bold"
                        style={{ color: C.fg, width: "36%" }}
                      >
                        Feature
                      </th>
                      <th
                        className="py-4 px-3 text-center"
                        style={{ background: `${C.accent}10`, borderLeft: `2px dashed ${C.border}`, borderRight: `2px dashed ${C.border}` }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <VoltexGem size={16} />
                          <span className="font-bold text-sm" style={{ fontFamily: "'Kalam', cursive", color: C.accent }}>
                            Voltex
                          </span>
                        </div>
                      </th>
                      {["Obsidian", "Notion", "Logseq"].map(app => (
                        <th key={app} className="py-4 px-3 text-center font-bold text-sm" style={{ fontFamily: "'Kalam', cursive", color: C.fg }}>
                          {app}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row, idx) => (
                      <tr
                        key={row.feature}
                        style={{
                          borderBottom: idx < comparison.length - 1 ? `1px dashed ${C.muted}` : "none",
                        }}
                      >
                        <td className="py-3 px-5 text-sm font-medium" style={{ color: C.fg }}>{row.feature}</td>
                        <td
                          className="py-3 px-3 text-center"
                          style={{
                            background: `${C.accent}06`,
                            borderLeft: `2px dashed ${C.muted}`,
                            borderRight: `2px dashed ${C.muted}`,
                          }}
                        >
                          <CellVal val={row.voltex} />
                        </td>
                        <td className="py-3 px-3 text-center"><CellVal val={row.obsidian} /></td>
                        <td className="py-3 px-3 text-center"><CellVal val={row.notion} /></td>
                        <td className="py-3 px-3 text-center"><CellVal val={row.logseq} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Download / CTA ─────────────────────────────────────────────── */}
      <section id="download" className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <div
              className="inline-block px-4 py-1 border-2 text-sm font-bold mb-4 rotate-[1deg]"
              style={{ borderRadius: WOBBLY_SM, borderColor: C.border, background: C.postIt, boxShadow: SHADOW_SM }}
            >
              Get Started
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Kalam', cursive" }}
            >
              Ready to{" "}
              <span className="relative inline-block">
                <span style={{ color: C.accent }}>get started?</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 250 8" fill="none" preserveAspectRatio="none">
                  <path d="M2 5 Q60 1 125 5 T248 4" stroke={C.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            <p className="text-lg" style={{ color: C.fg }}>
              Download the desktop app or jump straight into the web version. No sign-up needed.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop card */}
              <div
                className="relative p-6 md:p-8 border-[3px] flex flex-col rotate-[-1deg] hover:rotate-0 transition-transform duration-100"
                style={{
                  borderRadius: WOBBLY_MD,
                  borderColor: C.border,
                  background: C.white,
                  boxShadow: SHADOW_LG,
                }}
              >
                {/* Tape */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 rotate-[-2deg]"
                  style={{ background: "rgba(200,200,190,0.5)", borderRadius: "2px" }}
                />
                <div
                  className="w-14 h-14 flex items-center justify-center border-2 mb-6"
                  style={{
                    borderRadius: "50% 45% 55% 40% / 40% 55% 45% 50%",
                    borderColor: C.border,
                    background: `${C.accent}12`,
                  }}
                >
                  <Monitor size={28} strokeWidth={2.5} style={{ color: C.accent }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Kalam', cursive" }}>
                  Windows Desktop
                </h3>
                <p className="text-base leading-relaxed mb-6 flex-1" style={{ color: C.fg }}>
                  Native app with offline support, system tray integration, and auto-updates.
                </p>
                <a
                  href="https://github.com/Dev-Lune/voltex-notes/releases/latest"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 border-[3px] text-lg font-bold transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none mb-3"
                  style={{
                    borderRadius: WOBBLY_SM,
                    borderColor: C.border,
                    background: C.accent,
                    color: C.white,
                    boxShadow: SHADOW,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW_SM; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW; }}
                >
                  <Download size={16} strokeWidth={2.5} /> Download .exe
                </a>
                <span className="text-center text-xs" style={{ color: C.fg }}>
                  Windows 10+ · 64-bit · ~80 MB
                </span>
              </div>

              {/* Web card */}
              <div
                className="relative p-6 md:p-8 border-[3px] flex flex-col rotate-[1deg] hover:rotate-0 transition-transform duration-100"
                style={{
                  borderRadius: WOBBLY_MD,
                  borderColor: C.border,
                  background: C.white,
                  boxShadow: SHADOW_LG,
                }}
              >
                {/* Tack */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 border-[3px] z-10"
                  style={{
                    borderRadius: "50%",
                    background: C.blue,
                    borderColor: C.border,
                    boxShadow: `1px 1px 0px 0px ${C.border}`,
                  }}
                />
                <div
                  className="w-14 h-14 flex items-center justify-center border-2 mb-6"
                  style={{
                    borderRadius: "45% 55% 40% 50% / 50% 40% 55% 45%",
                    borderColor: C.border,
                    background: `${C.blue}12`,
                  }}
                >
                  <Smartphone size={28} strokeWidth={2.5} style={{ color: C.blue }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Kalam', cursive" }}>
                  Web Version
                </h3>
                <p className="text-base leading-relaxed mb-6 flex-1" style={{ color: C.fg }}>
                  No install needed. Works in any modern browser with full cloud sync and offline fallback.
                </p>
                <Link
                  href="/notes"
                  className="flex items-center justify-center gap-2 px-5 py-3 border-[3px] text-lg font-bold transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none mb-3"
                  style={{
                    borderRadius: WOBBLY_SM,
                    borderColor: C.border,
                    background: C.white,
                    color: C.fg,
                    boxShadow: SHADOW,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = C.blue;
                    e.currentTarget.style.color = C.white;
                    e.currentTarget.style.boxShadow = SHADOW_SM;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = C.white;
                    e.currentTarget.style.color = C.fg;
                    e.currentTarget.style.boxShadow = SHADOW;
                  }}
                >
                  <Globe size={16} strokeWidth={2.5} /> Open in Browser
                </Link>
                <span className="text-center text-xs" style={{ color: C.fg }}>
                  Chrome · Firefox · Safari · Edge
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 py-12 px-6 border-t-2"
        style={{ borderColor: C.border }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <VoltexGem size={22} />
                <span className="font-bold text-lg" style={{ fontFamily: "'Kalam', cursive" }}>
                  Volt<span style={{ color: C.accent }}>ex</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.fg }}>
                Open-source knowledge base for connected thinkers.
              </p>
            </div>

            {[
              {
                heading: "Product",
                links: [
                  ["#features", "Features"],
                  ["#comparison", "Compare"],
                  ["#download", "Download"],
                  ["/notes", "Open App"],
                ],
              },
              {
                heading: "Resources",
                links: [
                  ["https://github.com/Dev-Lune/voltex-notes", "GitHub"],
                  ["https://github.com/Dev-Lune/voltex-notes/issues", "Issues"],
                  ["https://github.com/Dev-Lune/voltex-notes/releases", "Releases"],
                ],
              },
              {
                heading: "Legal",
                links: [
                  ["https://github.com/Dev-Lune/voltex-notes/blob/main/LICENSE", "MIT License"],
                ],
              },
            ].map(col => (
              <div key={col.heading}>
                <h4
                  className="text-base font-bold mb-3 relative inline-block"
                  style={{ fontFamily: "'Kalam', cursive" }}
                >
                  {col.heading}
                  <span className="absolute -bottom-0.5 left-0 w-full h-[2px]" style={{ background: C.accent }} />
                </h4>
                <ul className="space-y-2">
                  {col.links.map(([href, label]) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-sm hover:line-through transition-all duration-100"
                        style={{ color: C.fg }}
                        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed mb-6" style={{ borderColor: C.muted }} />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm" style={{ color: C.fg }}>
              &copy; {new Date().getFullYear()} DevLune Studios. MIT License.
            </p>
            <a
              href="https://devlune.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline decoration-wavy underline-offset-4"
              style={{ color: C.fg, textDecorationColor: C.accent }}
            >
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M13 7.5C12.1 10.6 9.2 12.9 5.8 12.9 2.2 12.9 -0.2 10 0 6.5
                     0.3 3.1 3 0.5 6.4 0.3 6.1 1.2 6 2.2 6 3.2 6 7.5 9.5 11
                     13.8 11 13.5 9.9 13.3 8.7 13 7.5Z"
                  fill="#4F8EF7"
                />
              </svg>
              Built by <span style={{ fontWeight: 700 }}>Dev</span><span style={{ color: C.blue, fontWeight: 700 }}>Lune</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
