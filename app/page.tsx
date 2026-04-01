"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText, Network, Cloud, History, Puzzle, Palette,
  PenTool, Columns3, Terminal, Download, Globe, ArrowRight,
  Check, X, Github, Zap, Shield, Star, Sparkles, Link2,
  Search, Share2, ChevronDown, Monitor, Smartphone, Menu,
  X as XIcon,
} from "lucide-react";

/* ─── Gem SVG ───────────────────────────────────────────────────────────── */
function VoltexGem({ size = 80 }: { size?: number }) {
  const s = size / 80;
  return (
    <svg width={size} height={size * 1.45} viewBox="0 0 80 116" fill="none">
      {/* top face */}
      <polygon points="0,26 66,19 33,54" fill="#40C4FF" />
      {/* left face */}
      <polygon points="0,26 33,54 33,112 0,68" fill="#0B3F7A" />
      {/* right face */}
      <polygon points="66,19 76,68 33,112 33,54" fill="#1565C0" />
      {/* edges */}
      <line x1="0" y1="26" x2="33" y2="54" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <line x1="66" y1="19" x2="33" y2="54" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <line x1="33" y1="54" x2="33" y2="112" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      <polygon points="0,26 66,19 76,68 33,112 0,68" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* bolt */}
      <path d="M39 0 L27 0 L19 17 L28 17 L20 40 L46 40 L50 17 L39 17 Z"
        fill="#FFD600" stroke="rgba(255,220,0,0.35)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Animated grid background ──────────────────────────────────────────── */
function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let dots: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      initDots();
    }

    function initDots() {
      dots = [];
      const count = Math.floor((canvas!.width * canvas!.height) / 18000);
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5,
          o: Math.random() * 0.25 + 0.04,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > canvas!.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas!.height) dot.vy *= -1;
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(64,196,255,${dot.o})`;
        ctx!.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.moveTo(dots[i].x, dots[i].y);
            ctx!.lineTo(dots[j].x, dots[j].y);
            ctx!.strokeStyle = `rgba(64,196,255,${0.05 * (1 - dist / 120)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

/* ─── Scroll-reveal ─────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Animated counter ──────────────────────────────────────────────────── */
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
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [visible, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Data ──────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: FileText,
    title: "Markdown Editor",
    desc: "Live preview, syntax highlighting, smart lists, and floating toolbar. Pure distraction-free writing.",
    size: "large" as const,
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    desc: "Force-directed interactive graph with bidirectional [[wikilinks]], backlinks panel, and hover previews.",
    size: "large" as const,
  },
  {
    icon: Cloud,
    title: "Real-time Sync",
    desc: "Instant sync via Firebase. Offline-first with automatic conflict resolution and diff-based history.",
    size: "large" as const,
  },
  { icon: Link2,    title: "Bidirectional Links", desc: "[[Wikilinks]] that work both ways. See all backlinks in the side panel.",                        size: "small" as const },
  { icon: History,  title: "Version History",     desc: "Every edit tracked with inline diffs. One-click rollback to any point.",                         size: "small" as const },
  { icon: Puzzle,   title: "Plugin Ecosystem",    desc: "13+ plugins — Excalidraw, Kanban, AI assistant, Git sync, and more.",                           size: "small" as const },
  { icon: Palette,  title: "Themeable",           desc: "10+ built-in themes, plus a live custom theme editor with CSS variables.",                       size: "small" as const },
  { icon: PenTool,  title: "Canvas & Drawing",    desc: "Excalidraw integration for sketches, diagrams, and spatial thinking.",                           size: "small" as const },
  { icon: Columns3, title: "Kanban Boards",       desc: "Drag-and-drop task boards built right into your vault.",                                         size: "small" as const },
  { icon: Search,   title: "Advanced Search",     desc: "Operators like tag:, path:, type:, has: — find anything instantly.",                             size: "small" as const },
  { icon: Terminal, title: "Command Palette",     desc: "Ctrl+P fuzzy search for every action. Power-user paradise.",                                     size: "small" as const },
  { icon: Share2,   title: "Public Sharing",      desc: "One-click shareable links for any note. Clean read-only viewer.",                                size: "small" as const },
];

const comparison = [
  { feature: "Open Source",        voltex: true,    obsidian: false,     notion: false, logseq: true  },
  { feature: "Free Cloud Sync",    voltex: true,    obsidian: false,     notion: true,  logseq: false },
  { feature: "Graph View",         voltex: true,    obsidian: true,      notion: false, logseq: true  },
  { feature: "Markdown Native",    voltex: true,    obsidian: true,      notion: false, logseq: true  },
  { feature: "Version History",    voltex: true,    obsidian: true,      notion: true,  logseq: false },
  { feature: "Plugin Ecosystem",   voltex: true,    obsidian: true,      notion: false, logseq: true  },
  { feature: "Canvas / Whiteboard",voltex: true,    obsidian: true,      notion: false, logseq: true  },
  { feature: "Desktop App",        voltex: true,    obsidian: true,      notion: true,  logseq: true  },
  { feature: "Web App",            voltex: true,    obsidian: false,     notion: true,  logseq: false },
  { feature: "Real-time Collab",   voltex: "Soon",  obsidian: false,     notion: true,  logseq: false },
  { feature: "Custom Themes",      voltex: true,    obsidian: true,      notion: false, logseq: true  },
  { feature: "Kanban Boards",      voltex: true,    obsidian: "Plugin",  notion: true,  logseq: false },
];

const stats = [
  { label: "Features",        value: 50,  suffix: "+" },
  { label: "Built-in Themes", value: 10,  suffix: "+" },
  { label: "Plugins",         value: 13,  suffix: "+" },
  { label: "Open Source",     value: 100, suffix: "%" },
];

const CellVal = ({ val }: { val: boolean | string }) => {
  if (val === true)  return <Check size={15} className="text-[#40C4FF] mx-auto" />;
  if (val === false) return <X     size={15} className="text-[#2A2A3E] mx-auto" />;
  return <span className="text-[10px] font-medium text-[#555572] tracking-wide">{val}</span>;
};

/* ─── Page ──────────────────────────────────────────────────────────────── */
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
    <div className="min-h-screen bg-[#0A0A0F] text-[#F0F0F5] font-['DM_Sans',sans-serif] overflow-x-hidden">
      <GridBackground />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/[0.04]"
          : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <VoltexGem size={28} />
            <span className="font-['Sora',sans-serif] font-700 text-[15px] tracking-wide text-[#F0F0F5]">
              Volt<span className="text-[#40C4FF]">ex</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[["#features","Features"],["#comparison","Compare"],["#download","Download"]].map(([href,label]) => (
              <a key={href} href={href} className="text-[13px] text-[#555572] hover:text-[#F0F0F5] transition-colors duration-200 font-medium">
                {label}
              </a>
            ))}
            <a
              href="https://github.com/Dev-Lune/voltex-notes"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] text-[#555572] hover:text-[#F0F0F5] transition-colors"
            >
              <Github size={15} /> Star
            </a>
            <Link
              href="/notes"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#40C4FF] text-[#0A0A0F] text-[13px] font-['Sora',sans-serif] font-600 hover:bg-[#72D9FF] transition-colors"
            >
              Open App <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-[#8888A0] hover:text-[#F0F0F5] transition-colors"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XIcon size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0E0E18]/98 backdrop-blur-xl border-t border-white/[0.04] px-6 py-5 flex flex-col gap-4">
            {[["#features","Features"],["#comparison","Compare"],["#download","Download"]].map(([href,label]) => (
              <a key={href} href={href} onClick={closeMenu} className="text-[14px] text-[#8888A0] hover:text-[#F0F0F5] transition-colors">
                {label}
              </a>
            ))}
            <a href="https://github.com/Dev-Lune/voltex-notes" target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#8888A0]">GitHub</a>
            <Link href="/notes" onClick={closeMenu} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#40C4FF] text-[#0A0A0F] text-[14px] font-['Sora',sans-serif] font-600">
              Open App <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">

        {/* Radial glow behind gem */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(21,101,192,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Gem — hero centerpiece */}
        <div className="mb-8 drop-shadow-none">
          <VoltexGem size={96} />
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#40C4FF]/20 bg-[#40C4FF]/5 text-[#40C4FF] text-[12px] font-medium tracking-wider mb-8">
          <Sparkles size={12} />
          Open Source · Free Forever
        </div>

        {/* Heading */}
        <h1 className="font-['Sora',sans-serif] font-800 text-[52px] md:text-[72px] lg:text-[84px] leading-[1.02] tracking-tight text-center max-w-4xl mb-6">
          Your second brain,
          <br />
          <span className="text-[#40C4FF]">supercharged.</span>
        </h1>

        {/* Sub */}
        <p className="text-[#555572] text-[16px] md:text-[18px] leading-[1.75] text-center max-w-2xl mb-10">
          The open-source knowledge base with graph view, real-time cloud sync,
          bidirectional linking, version history, and a full plugin ecosystem —
          built for people who think in connected ideas.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
          <a
            href="#download"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#40C4FF] text-[#0A0A0F] font-['Sora',sans-serif] font-700 text-[14px] hover:bg-[#72D9FF] transition-colors shadow-[0_0_32px_rgba(64,196,255,0.18)]"
          >
            <Download size={16} /> Download for Windows
          </a>
          <Link
            href="/notes"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-[#F0F0F5] font-['Sora',sans-serif] font-600 text-[14px] hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <Globe size={16} /> Use Web Version
          </Link>
        </div>

        {/* Trust pills */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {[
            [Zap,    "No account required"],
            [Shield, "Works offline"],
            [Star,   "Your data stays yours"],
          ].map(([Icon, label]) => (
            <div key={label as string} className="flex items-center gap-1.5 text-[12px] text-[#2A2A44]">
              {/* @ts-ignore */}
              <Icon size={11} className="text-[#2A2A44]" />
              {label as string}
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#1E1E30] animate-bounce">
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-white/[0.04] bg-[#0D0D18]/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <div className="font-['Sora',sans-serif] font-800 text-[36px] text-[#F0F0F5] leading-none mb-1">
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-[12px] text-[#3A3A55] tracking-widest uppercase font-medium">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">

          <Reveal className="text-center mb-20">
            <p className="text-[11px] tracking-[4px] text-[#40C4FF] uppercase font-medium mb-4">Features</p>
            <h2 className="font-['Sora',sans-serif] font-800 text-[40px] md:text-[52px] leading-tight tracking-tight mb-4">
              Everything you need to{" "}
              <span className="text-[#40C4FF]">think better</span>
            </h2>
            <p className="text-[#3A3A55] text-[16px] max-w-xl mx-auto">
              All the power of enterprise tools — none of the lock-in.
            </p>
          </Reveal>

          {/* Bento grid — asymmetric layout */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-auto">

            {/* Hero 1 — Markdown Editor — spans 4 cols */}
            <Reveal delay={0} className="md:col-span-4">
              <div className="group relative h-full rounded-2xl border border-white/[0.05] bg-[#0D0D18] overflow-hidden transition-all duration-400 hover:border-[#40C4FF]/20">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#40C4FF]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#40C4FF]/15 to-[#40C4FF]/5 flex items-center justify-center border border-[#40C4FF]/10 group-hover:border-[#40C4FF]/25 transition-colors">
                      <FileText size={20} strokeWidth={1.5} className="text-[#40C4FF]" />
                    </div>
                    <span className="text-[10px] tracking-[3px] text-[#40C4FF]/50 uppercase font-medium">Core</span>
                  </div>
                  <h3 className="font-['Sora',sans-serif] font-700 text-[20px] text-[#E0E0F0] mb-3">Markdown Editor</h3>
                  <p className="text-[14px] text-[#444460] leading-relaxed max-w-md">
                    Live preview, syntax highlighting, smart lists, and floating toolbar. Pure distraction-free writing with vim-like keyboard shortcuts.
                  </p>
                  <div className="flex gap-2 mt-6">
                    {["Live Preview", "Syntax Highlighting", "Smart Lists"].map(tag => (
                      <span key={tag} className="text-[10px] px-2.5 py-1 rounded-md bg-[#40C4FF]/[0.04] border border-[#40C4FF]/[0.08] text-[#40C4FF]/50 tracking-wide">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Hero 2 — Knowledge Graph — spans 2 cols, tall */}
            <Reveal delay={80} className="md:col-span-2 md:row-span-2">
              <div className="group relative h-full rounded-2xl border border-white/[0.05] bg-[#0D0D18] overflow-hidden transition-all duration-400 hover:border-[#1565C0]/25">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#1565C0]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Graph dots decoration */}
                <div className="absolute top-6 right-6 w-24 h-24 opacity-[0.06]">
                  <svg viewBox="0 0 100 100" fill="none">
                    <circle cx="20" cy="20" r="3" fill="#40C4FF" />
                    <circle cx="60" cy="15" r="4" fill="#40C4FF" />
                    <circle cx="80" cy="50" r="3" fill="#40C4FF" />
                    <circle cx="40" cy="70" r="5" fill="#40C4FF" />
                    <circle cx="15" cy="60" r="3" fill="#40C4FF" />
                    <line x1="20" y1="20" x2="60" y2="15" stroke="#40C4FF" strokeWidth="1" />
                    <line x1="60" y1="15" x2="80" y2="50" stroke="#40C4FF" strokeWidth="1" />
                    <line x1="40" y1="70" x2="80" y2="50" stroke="#40C4FF" strokeWidth="1" />
                    <line x1="15" y1="60" x2="40" y2="70" stroke="#40C4FF" strokeWidth="1" />
                    <line x1="20" y1="20" x2="15" y2="60" stroke="#40C4FF" strokeWidth="1" />
                  </svg>
                </div>
                <div className="p-8 md:p-10 flex flex-col h-full">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1565C0]/20 to-[#1565C0]/5 flex items-center justify-center border border-[#1565C0]/15 group-hover:border-[#1565C0]/30 transition-colors mb-6">
                    <Network size={20} strokeWidth={1.5} className="text-[#40C4FF]" />
                  </div>
                  <h3 className="font-['Sora',sans-serif] font-700 text-[20px] text-[#E0E0F0] mb-3">Knowledge Graph</h3>
                  <p className="text-[14px] text-[#444460] leading-relaxed flex-1">
                    Force-directed interactive graph with bidirectional [[wikilinks]], backlinks panel, and hover previews. See how your ideas connect.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] text-[#40C4FF]/40">
                    <Network size={12} />
                    <span>Interactive · Force-directed · Real-time</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Hero 3 — Real-time Sync — spans 2 cols */}
            <Reveal delay={120} className="md:col-span-2">
              <div className="group relative h-full rounded-2xl border border-white/[0.05] bg-[#0D0D18] overflow-hidden transition-all duration-400 hover:border-[#40C4FF]/20">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#40C4FF]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-8">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#40C4FF]/12 to-[#40C4FF]/4 flex items-center justify-center border border-[#40C4FF]/10 group-hover:border-[#40C4FF]/25 transition-colors mb-5">
                    <Cloud size={20} strokeWidth={1.5} className="text-[#40C4FF]" />
                  </div>
                  <h3 className="font-['Sora',sans-serif] font-700 text-[16px] text-[#E0E0F0] mb-2">Real-time Sync</h3>
                  <p className="text-[13px] text-[#444460] leading-relaxed">Instant sync via Firebase. Offline-first with automatic conflict resolution.</p>
                </div>
              </div>
            </Reveal>

            {/* Another 2-col card — Bidirectional Links */}
            <Reveal delay={140} className="md:col-span-2">
              <div className="group relative h-full rounded-2xl border border-white/[0.05] bg-[#0D0D18] overflow-hidden transition-all duration-400 hover:border-[#40C4FF]/15">
                <div className="p-8">
                  <div className="w-10 h-10 rounded-xl bg-[#40C4FF]/[0.04] flex items-center justify-center border border-[#40C4FF]/[0.08] group-hover:border-[#40C4FF]/20 transition-colors mb-5">
                    <Link2 size={18} strokeWidth={1.5} className="text-[#40C4FF]" />
                  </div>
                  <h3 className="font-['Sora',sans-serif] font-700 text-[16px] text-[#E0E0F0] mb-2">Bidirectional Links</h3>
                  <p className="text-[13px] text-[#444460] leading-relaxed">[[Wikilinks]] that work both ways. See all backlinks in the side panel.</p>
                </div>
              </div>
            </Reveal>

            {/* Compact row — 3 x 2-col */}
            {[
              { icon: History,  title: "Version History",  desc: "Every edit tracked with inline diffs. One-click rollback to any point." },
              { icon: Puzzle,   title: "Plugin Ecosystem",  desc: "13+ plugins — Excalidraw, Kanban, AI assistant, Git sync, and more." },
              { icon: Palette,  title: "Themeable",         desc: "10+ built-in themes, plus a live custom theme editor with CSS variables." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={160 + i * 50} className="md:col-span-2">
                <div className="group flex gap-4 h-full rounded-2xl border border-white/[0.04] bg-[#0D0D18] hover:border-white/[0.08] transition-all duration-300 p-6">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-[#40C4FF]/15 transition-colors mt-0.5">
                    <f.icon size={16} strokeWidth={1.5} className="text-[#555572] group-hover:text-[#40C4FF] transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-['Sora',sans-serif] font-600 text-[14px] text-[#C0C0D8] mb-1">{f.title}</h3>
                    <p className="text-[12px] text-[#333348] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}

            {/* Bottom compact row */}
            {[
              { icon: PenTool,  title: "Canvas & Drawing",  desc: "Excalidraw integration for sketches, diagrams, and spatial thinking." },
              { icon: Columns3, title: "Kanban Boards",      desc: "Drag-and-drop task boards built right into your vault." },
              { icon: Search,   title: "Advanced Search",    desc: "Operators like tag:, path:, type:, has: — find anything instantly." },
              { icon: Terminal, title: "Command Palette",    desc: "Ctrl+P fuzzy search for every action. Power-user paradise." },
              { icon: Share2,   title: "Public Sharing",     desc: "One-click shareable links for any note. Clean read-only viewer." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={200 + i * 40} className={i < 3 ? "md:col-span-2" : "md:col-span-3"}>
                <div className="group flex gap-4 h-full rounded-2xl border border-white/[0.04] bg-[#0D0D18] hover:border-white/[0.08] transition-all duration-300 p-6">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-[#40C4FF]/15 transition-colors mt-0.5">
                    <f.icon size={16} strokeWidth={1.5} className="text-[#555572] group-hover:text-[#40C4FF] transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-['Sora',sans-serif] font-600 text-[14px] text-[#C0C0D8] mb-1">{f.title}</h3>
                    <p className="text-[12px] text-[#333348] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}

          </div>
        </div>
      </section>

      {/* ── Comparison table ────────────────────────────────────────────── */}
      <section id="comparison" className="relative z-10 py-28 px-6 border-t border-white/[0.04] bg-[#0C0C14]/50">
        <div className="max-w-4xl mx-auto">

          <Reveal className="text-center mb-16">
            <p className="text-[11px] tracking-[4px] text-[#40C4FF] uppercase font-medium mb-4">Compare</p>
            <h2 className="font-['Sora',sans-serif] font-800 text-[40px] md:text-[52px] leading-tight tracking-tight mb-4">
              How Voltex <span className="text-[#40C4FF]">compares</span>
            </h2>
            <p className="text-[#3A3A55] text-[16px]">
              See how we stack up against other popular knowledge tools.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-2xl border border-white/[0.05] overflow-hidden bg-[#0D0D18]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left py-4 px-6 text-[12px] text-[#2A2A3E] font-medium tracking-widest uppercase w-[36%]">
                      Feature
                    </th>
                    <th className="py-4 px-4 text-center bg-[#40C4FF]/[0.04] border-x border-[#40C4FF]/10">
                      <div className="flex items-center justify-center gap-1.5">
                        <VoltexGem size={16} />
                        <span className="font-['Sora',sans-serif] font-700 text-[12px] text-[#40C4FF]">Voltex</span>
                      </div>
                    </th>
                    {["Obsidian","Notion","Logseq"].map(app => (
                      <th key={app} className="py-4 px-4 text-center font-['Sora',sans-serif] font-600 text-[12px] text-[#2A2A3E]">
                        {app}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, idx) => (
                    <tr key={row.feature} className={`border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors ${idx === comparison.length - 1 ? "border-b-0" : ""}`}>
                      <td className="py-3.5 px-6 text-[13px] text-[#444460] font-medium">{row.feature}</td>
                      <td className="py-3.5 px-4 text-center bg-[#40C4FF]/[0.02] border-x border-[#40C4FF]/[0.06]">
                        <CellVal val={row.voltex} />
                      </td>
                      <td className="py-3.5 px-4 text-center"><CellVal val={row.obsidian} /></td>
                      <td className="py-3.5 px-4 text-center"><CellVal val={row.notion} /></td>
                      <td className="py-3.5 px-4 text-center"><CellVal val={row.logseq} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Download / CTA ──────────────────────────────────────────────── */}
      <section id="download" className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-[11px] tracking-[4px] text-[#40C4FF] uppercase font-medium mb-4">Get Started</p>
            <h2 className="font-['Sora',sans-serif] font-800 text-[40px] md:text-[52px] leading-tight tracking-tight mb-4">
              Ready to <span className="text-[#40C4FF]">get started?</span>
            </h2>
            <p className="text-[#3A3A55] text-[16px]">
              Download the desktop app or jump straight into the web version. No sign-up needed.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Desktop */}
              <div className="rounded-2xl border border-white/[0.05] bg-[#0D0D18] hover:border-[#40C4FF]/20 transition-colors p-8 flex flex-col">
                <div className="w-14 h-14 rounded-2xl border border-[#40C4FF]/15 bg-[#40C4FF]/[0.04] flex items-center justify-center mb-6">
                  <Monitor size={26} strokeWidth={1.5} className="text-[#40C4FF]" />
                </div>
                <h3 className="font-['Sora',sans-serif] font-700 text-[18px] text-[#E0E0F0] mb-2">Windows Desktop</h3>
                <p className="text-[14px] text-[#333348] leading-relaxed mb-6 flex-1">
                  Native app with offline support, system tray integration, and auto-updates.
                </p>
                <a
                  href="https://github.com/Dev-Lune/voltex-notes/releases/latest"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#40C4FF] text-[#0A0A0F] font-['Sora',sans-serif] font-700 text-[14px] hover:bg-[#72D9FF] transition-colors shadow-[0_0_28px_rgba(64,196,255,0.15)] mb-3"
                >
                  <Download size={15} /> Download .exe
                </a>
                <span className="text-center text-[11px] text-[#222234] tracking-wide">Windows 10+ · 64-bit · ~80 MB</span>
              </div>

              {/* Web */}
              <div className="rounded-2xl border border-white/[0.05] bg-[#0D0D18] hover:border-white/10 transition-colors p-8 flex flex-col">
                <div className="w-14 h-14 rounded-2xl border border-white/[0.07] bg-white/[0.02] flex items-center justify-center mb-6">
                  <Smartphone size={26} strokeWidth={1.5} className="text-[#8888A0]" />
                </div>
                <h3 className="font-['Sora',sans-serif] font-700 text-[18px] text-[#E0E0F0] mb-2">Web Version</h3>
                <p className="text-[14px] text-[#333348] leading-relaxed mb-6 flex-1">
                  No install needed. Works in any modern browser with full cloud sync and offline fallback.
                </p>
                <Link
                  href="/notes"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#F0F0F5] font-['Sora',sans-serif] font-600 text-[14px] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all mb-3"
                >
                  <Globe size={15} /> Open in Browser
                </Link>
                <span className="text-center text-[11px] text-[#222234] tracking-wide">Chrome · Firefox · Safari · Edge</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer with DevLune branding ──────────────────────────────── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <Image src="/voltex-icon.svg" alt="Voltex" width={24} height={24} />
              <span>Voltex Notes</span>
            </div>
            <div className="hp-footer-links">
              <a href="https://github.com/Dev-Lune/voltex-notes" target="_blank" rel="noopener noreferrer">
                <Github size={15} /> GitHub
              </a>
              <Link href="/notes">
                <Globe size={15} /> Web App
              </Link>
              <a href="mailto:sidharth@devlune.in">Contact</a>
            </div>
          </div>

          <div className="hp-footer-divider" />

          <div className="hp-footer-bottom">
            <p className="hp-footer-copy">
              &copy; {new Date().getFullYear()} DevLune Studios. MIT License.
            </p>
            <a
              href="https://devlune.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hp-devlune-link"
            >
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M13 7.5C12.1 10.6 9.2 12.9 5.8 12.9 2.2 12.9 -0.2 10 0 6.5
                     0.3 3.1 3 0.5 6.4 0.3 6.1 1.2 6 2.2 6 3.2 6 7.5 9.5 11
                     13.8 11 13.5 9.9 13.3 8.7 13 7.5Z"
                  fill="#4F8EF7"
                />
              </svg>
              <span className="hp-devlune-label">
                Built by <span style={{ color: "#E8E8F0", fontWeight: 600 }}>Dev</span><span style={{ color: "#4F8EF7", fontWeight: 600 }}>Lune</span>
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
