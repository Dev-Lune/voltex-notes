"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Info, AlertTriangle, CheckCircle, XCircle, Lightbulb,
  Quote, Flame, Bug, HelpCircle, List, Bookmark, Pencil,
  FileText, Zap, Target, Heart
} from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  notes?: Array<{ id: string; title: string; content: string }>;
  onWikilinkClick?: (title: string) => void;
  onHoverLink?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Callout Types ────────────────────────────────────────────────────────────

const CALLOUT_TYPES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  note: { icon: Pencil, color: "#89b4fa", bg: "rgba(137,180,250,0.1)" },
  info: { icon: Info, color: "#89b4fa", bg: "rgba(137,180,250,0.1)" },
  tip: { icon: Lightbulb, color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  hint: { icon: Lightbulb, color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  important: { icon: Flame, color: "#cba6f7", bg: "rgba(203,166,247,0.1)" },
  warning: { icon: AlertTriangle, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  caution: { icon: AlertTriangle, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  danger: { icon: XCircle, color: "#f38ba8", bg: "rgba(243,139,168,0.1)" },
  error: { icon: XCircle, color: "#f38ba8", bg: "rgba(243,139,168,0.1)" },
  success: { icon: CheckCircle, color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  check: { icon: CheckCircle, color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  question: { icon: HelpCircle, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  faq: { icon: HelpCircle, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  quote: { icon: Quote, color: "#cdd6f4", bg: "rgba(205,214,244,0.08)" },
  cite: { icon: Quote, color: "#cdd6f4", bg: "rgba(205,214,244,0.08)" },
  abstract: { icon: FileText, color: "#89dceb", bg: "rgba(137,220,235,0.1)" },
  summary: { icon: List, color: "#89dceb", bg: "rgba(137,220,235,0.1)" },
  todo: { icon: List, color: "#89b4fa", bg: "rgba(137,180,250,0.1)" },
  bug: { icon: Bug, color: "#f38ba8", bg: "rgba(243,139,168,0.1)" },
  example: { icon: List, color: "#cba6f7", bg: "rgba(203,166,247,0.1)" },
  bookmark: { icon: Bookmark, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  zap: { icon: Zap, color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  goal: { icon: Target, color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  love: { icon: Heart, color: "#f38ba8", bg: "rgba(243,139,168,0.1)" },
};

// ─── Math Renderer ────────────────────────────────────────────────────────────

function MathBlock({ tex, display }: { tex: string; display: boolean }) {
  // Simple LaTeX-like rendering (basic support)
  const rendered = tex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="frac"><span class="num">$1</span><span class="denom">$2</span></span>')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\int/g, '∫')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\pm/g, '±')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftarrow/g, '⇐')
    .replace(/\^{([^}]+)}/g, '<sup>$1</sup>')
    .replace(/_{([^}]+)}/g, '<sub>$1</sub>')
    .replace(/\^(\w)/g, '<sup>$1</sup>')
    .replace(/_(\w)/g, '<sub>$1</sub>');

  if (display) {
    return (
      <div
        className="math-block"
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "16px 20px",
          margin: "16px 0",
          background: "var(--color-obsidian-code-bg)",
          borderRadius: "8px",
          border: "1px solid var(--color-obsidian-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "1.1em",
          color: "var(--color-obsidian-text)",
          overflowX: "auto",
        }}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  }

  return (
    <span
      className="math-inline"
      style={{
        fontFamily: "var(--font-mono)",
        background: "var(--color-obsidian-code-bg)",
        padding: "1px 6px",
        borderRadius: "4px",
        color: "var(--color-obsidian-text)",
      }}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

// ─── Embed Preview ────────────────────────────────────────────────────────────

function EmbedPreview({
  title,
  notes,
  onWikilinkClick,
}: {
  title: string;
  notes?: Array<{ id: string; title: string; content: string }>;
  onWikilinkClick?: (title: string) => void;
}) {
  const note = notes?.find((n) => n.title.toLowerCase() === title.toLowerCase());

  if (!note) {
    return (
      <div
        className="embed-preview"
        style={{
          padding: "12px 16px",
          margin: "12px 0",
          background: "var(--color-obsidian-surface)",
          border: "1px dashed var(--color-obsidian-border)",
          borderRadius: "8px",
          color: "var(--color-obsidian-muted-text)",
          fontStyle: "italic",
          fontSize: "0.9em",
        }}
      >
        Note not found: {title}
      </div>
    );
  }

  // Render first 200 chars of content
  const preview = note.content.slice(0, 300);

  return (
    <div
      className="embed-preview"
      style={{
        margin: "16px 0",
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => onWikilinkClick?.(title)}
        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
        style={{
          borderBottom: "1px solid var(--color-obsidian-border)",
          color: "var(--color-obsidian-link)",
          fontSize: "0.9em",
          fontWeight: 500,
        }}
      >
        <FileText size={14} />
        {note.title}
      </button>
      <div
        style={{
          padding: "12px 16px",
          fontSize: "0.85em",
          color: "var(--color-obsidian-muted-text)",
          lineHeight: 1.6,
          maxHeight: 150,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview}
        {note.content.length > 300 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: "linear-gradient(transparent, var(--color-obsidian-surface))",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Callout Block ────────────────────────────────────────────────────────────

function CalloutBlock({
  type,
  title,
  content,
  foldable,
  defaultFolded,
  onWikilinkClick,
}: {
  type: string;
  title?: string;
  content: string;
  foldable: boolean;
  defaultFolded: boolean;
  onWikilinkClick?: (title: string) => void;
}) {
  const [folded, setFolded] = useState(defaultFolded);
  const calloutType = CALLOUT_TYPES[type.toLowerCase()] ?? CALLOUT_TYPES.note;
  const { icon: Icon, color, bg } = calloutType;
  const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div
      className="callout-block"
      style={{
        margin: "16px 0",
        borderRadius: "8px",
        border: `1px solid ${color}40`,
        background: bg,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => foldable && setFolded((v) => !v)}
        className="w-full text-left flex items-center gap-2 px-4 py-3"
        style={{
          color,
          fontWeight: 600,
          fontSize: "0.9em",
          cursor: foldable ? "pointer" : "default",
        }}
      >
        <Icon size={16} />
        <span className="flex-1">{displayTitle}</span>
        {foldable && (
          <span
            style={{
              transform: folded ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            ▼
          </span>
        )}
      </button>
      {!folded && (
        <div
          style={{
            padding: "0 16px 12px",
            fontSize: "0.9em",
            color: "var(--color-obsidian-text)",
            lineHeight: 1.7,
          }}
        >
          {content.split("\n").map((line, i) => (
            <p key={i} style={{ margin: i > 0 ? "8px 0 0" : 0 }}>
              {parseInline(line, onWikilinkClick)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mermaid Diagram Renderer ──────────────────────────────────────────────────

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const containerId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        // Dynamic import of mermaid
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#7c6af7",
            primaryTextColor: "#cdd6f4",
            primaryBorderColor: "#585b70",
            lineColor: "#89b4fa",
            secondaryColor: "#313244",
            tertiaryColor: "#1e1e2e",
            background: "#1e1e2e",
            mainBkg: "#1e1e2e",
            nodeBkg: "#313244",
            nodeBorder: "#585b70",
            clusterBkg: "#181825",
            clusterBorder: "#45475a",
            titleColor: "#cdd6f4",
            edgeLabelBackground: "#1e1e2e",
          },
          securityLevel: "loose",
          fontFamily: "var(--font-sans)",
        });
        const { svg: renderedSvg } = await mermaid.render(containerId.current, code);
        setSvg(renderedSvg);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };
    renderMermaid();
  }, [code]);

  if (error) {
    return (
      <div
        style={{
          margin: "16px 0",
          padding: "16px",
          background: "rgba(243,139,168,0.1)",
          border: "1px solid rgba(243,139,168,0.3)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#f38ba8" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Mermaid Error
        </div>
        <pre style={{ fontSize: "0.8em", color: "var(--color-obsidian-muted-text)", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
        <details style={{ marginTop: "8px" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.8em", color: "var(--color-obsidian-muted-text)" }}>
            Show code
          </summary>
          <pre style={{ marginTop: "8px", fontSize: "0.75em", fontFamily: "var(--font-mono)" }}>{code}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          margin: "16px 0",
          padding: "40px 20px",
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div className="animate-pulse" style={{ color: "var(--color-obsidian-muted-text)", fontSize: "0.85em" }}>
          Rendering diagram...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "16px 0",
        padding: "20px",
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
        borderRadius: "8px",
        overflow: "auto",
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "flex", justifyContent: "center" }} />
    </div>
  );
}

// ─── Block Reference ──────────────────────────────────────────────────────────

function BlockReference({
  noteTitle,
  blockId,
  notes,
  onNoteClick,
}: {
  noteTitle: string;
  blockId: string;
  notes?: Array<{ id: string; title: string; content: string }>;
  onNoteClick?: (title: string) => void;
}) {
  const note = notes?.find((n) => n.title.toLowerCase() === noteTitle.toLowerCase());
  
  if (!note) {
    return (
      <span
        style={{
          padding: "2px 6px",
          background: "rgba(243,139,168,0.15)",
          borderRadius: "4px",
          color: "#f38ba8",
          fontSize: "0.85em",
        }}
      >
        Block not found: {noteTitle}^{blockId}
      </span>
    );
  }

  // Find the block by ID (blocks are marked with ^blockId at end of line)
  const lines = note.content.split("\n");
  const blockLine = lines.find((l) => l.includes(`^${blockId}`));
  
  if (!blockLine) {
    return (
      <span
        style={{
          padding: "2px 6px",
          background: "rgba(249,226,175,0.15)",
          borderRadius: "4px",
          color: "#f9e2af",
          fontSize: "0.85em",
        }}
      >
        Block ^{blockId} not found in {noteTitle}
      </span>
    );
  }

  const blockContent = blockLine.replace(new RegExp(`\\s*\\^${blockId}\\s*$`), "");

  return (
    <div
      style={{
        margin: "12px 0",
        padding: "12px 16px",
        background: "var(--color-obsidian-surface)",
        borderLeft: "3px solid var(--color-obsidian-accent)",
        borderRadius: "0 6px 6px 0",
      }}
    >
      <div style={{ fontSize: "0.9em", color: "var(--color-obsidian-text)", marginBottom: "8px" }}>
        {blockContent}
      </div>
      <button
        onClick={() => onNoteClick?.(noteTitle)}
        style={{
          fontSize: "0.75em",
          color: "var(--color-obsidian-link)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        {noteTitle}
      </button>
    </div>
  );
}

// ─── Foldable Heading ─────────────────────────────────────────────────────────

function FoldableHeading({
  level,
  text,
  children,
  onWikilinkClick,
  onHoverLink,
  onHoverEnd,
  notes,
}: {
  level: number;
  text: string;
  children: React.ReactNode[];
  onWikilinkClick?: (title: string) => void;
  onHoverLink?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  notes?: Array<{ id: string; title: string; content: string }>;
}) {
  const [folded, setFolded] = useState(false);
  const sizes: Record<number, string> = {
    1: "1.8em", 2: "1.45em", 3: "1.2em", 4: "1.05em", 5: "0.95em", 6: "0.9em",
  };
  const margins: Record<number, string> = {
    1: "28px 0 12px", 2: "24px 0 10px", 3: "20px 0 8px", 4: "16px 0 6px", 5: "14px 0 4px", 6: "12px 0 4px",
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFolded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setFolded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-obsidian-muted-text)",
            transition: "transform 0.15s ease",
            transform: folded ? "rotate(-90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 2l4 3-4 3V2z" />
          </svg>
        </span>
        {React.createElement(
          `h${level}` as keyof JSX.IntrinsicElements,
          {
            id: text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
            style: {
              fontSize: sizes[level],
              fontWeight: level <= 2 ? 700 : 600,
              color: "var(--color-foreground)",
              margin: margins[level],
              lineHeight: 1.3,
              borderBottom: level === 1 ? "1px solid var(--color-obsidian-border)" : "none",
              paddingBottom: level === 1 ? "8px" : "0",
              flex: 1,
            },
          },
          parseInline(text, onWikilinkClick, onHoverLink, onHoverEnd, notes)
        )}
      </div>
      {!folded && <div style={{ paddingLeft: level === 1 ? 0 : 24 }}>{children}</div>}
    </div>
  );
}

// ─── Inline Parser ────────────────────────────────────────────────────────────

function parseInline(
  text: string,
  onWikilinkClick?: (title: string) => void,
  onHoverLink?: (title: string, rect: DOMRect) => void,
  onHoverEnd?: () => void,
  notes?: Array<{ id: string; title: string; content: string }>
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Pattern: wikilinks (including block refs), embeds, bold, italic, strikethrough, highlight, inline code, external links, tags, inline math
  // Block reference pattern: [[Note^blockId]] or [[Note#heading]]
  const pattern =
    /(!?\[\[([^\]|^#]+)(?:\^([a-zA-Z0-9_-]+))?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\])|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(#([a-zA-Z0-9_/-]+))|(~~([^~]+)~~)|(==([^=]+)==)|(\$([^$]+)\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    if (match[1]) {
      // Wikilink [[Title]], [[Title^blockId]], [[Title#heading]], or ![[Title]] (embed)
      const isEmbed = match[1].startsWith("!");
      const linkTitle = match[2];
      const blockId = match[3]; // ^blockId
      const headingRef = match[4]; // #heading
      const alias = match[5];
      
      if (isEmbed) {
        // Inline embed indicator
        parts.push(
          <span
            key={match.index}
            className="wikilink-embed-inline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              background: "rgba(124,106,247,0.1)",
              borderRadius: "4px",
              color: "var(--color-obsidian-accent-soft)",
              fontSize: "0.9em",
            }}
          >
            <FileText size={12} />
            {alias || linkTitle}
          </span>
        );
      } else if (blockId) {
        // Block reference [[Note^blockId]]
        parts.push(
          <span
            key={match.index}
            className="block-reference"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "1px 6px",
              background: "rgba(137,180,250,0.1)",
              borderRadius: "4px",
              color: "var(--color-obsidian-link)",
              fontSize: "0.9em",
              cursor: "pointer",
            }}
            onClick={() => onWikilinkClick?.(linkTitle)}
            title={`Block reference: ${linkTitle}^${blockId}`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
            </svg>
            {alias || `${linkTitle}^${blockId}`}
          </span>
        );
      } else if (headingRef) {
        // Heading reference [[Note#heading]]
        parts.push(
          <WikilinkButton
            key={match.index}
            title={linkTitle}
            alias={alias || `${linkTitle}#${headingRef}`}
            onClick={() => {
              onWikilinkClick?.(linkTitle);
              // After navigation, scroll to heading
              setTimeout(() => {
                const headingId = headingRef.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                const el = document.getElementById(headingId);
                el?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            onHover={onHoverLink}
            onHoverEnd={onHoverEnd}
          />
        );
      } else {
        parts.push(
          <WikilinkButton
            key={match.index}
            title={linkTitle}
            alias={alias}
            onClick={() => onWikilinkClick?.(linkTitle)}
            onHover={onHoverLink}
            onHoverEnd={onHoverEnd}
          />
        );
      }
    } else if (match[6]) {
      // Bold **text**
      parts.push(
        <strong key={match.index} style={{ color: "var(--color-foreground)", fontWeight: 600 }}>
          {match[7]}
        </strong>
      );
    } else if (match[8]) {
      // Italic *text*
      parts.push(
        <em key={match.index} style={{ color: "var(--color-obsidian-muted-text)" }}>
          {match[9]}
        </em>
      );
    } else if (match[10]) {
      // Inline code `code`
      parts.push(
        <code
          key={match.index}
          style={{
            background: "var(--color-obsidian-code-bg)",
            color: "var(--color-obsidian-code-text)",
            padding: "1px 5px",
            borderRadius: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.87em",
          }}
        >
          {match[11]}
        </code>
      );
    } else if (match[12]) {
      // External link [text](url)
      parts.push(
        <a
          key={match.index}
          href={match[14]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-obsidian-link)", textDecoration: "underline" }}
        >
          {match[13]}
        </a>
      );
    } else if (match[15]) {
      // Tag #tag
      parts.push(
        <span
          key={match.index}
          style={{
            color: "var(--color-obsidian-tag)",
            background: "var(--color-obsidian-tag-bg)",
            padding: "1px 6px",
            borderRadius: "9999px",
            fontSize: "0.82em",
            fontWeight: 500,
          }}
        >
          #{match[16]}
        </span>
      );
    } else if (match[17]) {
      // Strikethrough ~~text~~
      parts.push(
        <del key={match.index} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.7 }}>
          {match[18]}
        </del>
      );
    } else if (match[19]) {
      // Highlight ==text==
      parts.push(
        <mark
          key={match.index}
          style={{
            background: "rgba(249,226,175,0.3)",
            color: "var(--color-obsidian-text)",
            padding: "0 4px",
            borderRadius: "2px",
          }}
        >
          {match[20]}
        </mark>
      );
    } else if (match[21]) {
      // Inline math $tex$
      parts.push(<MathBlock key={match.index} tex={match[22]} display={false} />);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts;
}

// ─── Wikilink Button with Hover ───────────────────────────────────────────────

function WikilinkButton({
  title,
  alias,
  onClick,
  onHover,
  onHoverEnd,
}: {
  title: string;
  alias?: string;
  onClick: () => void;
  onHover?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (onHover && ref.current) {
      timeoutRef.current = setTimeout(() => {
        const rect = ref.current!.getBoundingClientRect();
        onHover(title, rect);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onHoverEnd?.();
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="wikilink"
      style={{
        color: "var(--color-obsidian-link)",
        textDecoration: "none",
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
      }}
    >
      {alias || title}
    </button>
  );
}

// ─── Footnote References ──────────────────────────────────────────────────────

function FootnoteRef({ id }: { id: string }) {
  return (
    <sup>
      <a
        href={`#fn-${id}`}
        id={`fnref-${id}`}
        style={{
          color: "var(--color-obsidian-accent-soft)",
          textDecoration: "none",
          fontSize: "0.8em",
        }}
      >
        [{id}]
      </a>
    </sup>
  );
}

function FootnoteBlock({ id, content }: { id: string; content: string }) {
  return (
    <div
      id={`fn-${id}`}
      style={{
        display: "flex",
        gap: "8px",
        fontSize: "0.85em",
        color: "var(--color-obsidian-muted-text)",
        padding: "8px 0",
        borderBottom: "1px solid var(--color-obsidian-border)",
      }}
    >
      <a
        href={`#fnref-${id}`}
        style={{ color: "var(--color-obsidian-accent-soft)", textDecoration: "none" }}
      >
        [{id}]
      </a>
      <span>{content}</span>
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export default function MarkdownRenderer({
  content,
  notes,
  onWikilinkClick,
  onHoverLink,
  onHoverEnd,
  className = "",
}: MarkdownRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  const footnotes: Array<{ id: string; content: string }> = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Display math block $$...$$
    if (line.trim().startsWith("$$")) {
      const mathLines: string[] = [];
      if (line.trim() !== "$$") {
        mathLines.push(line.replace("$$", "").trim());
      }
      i++;
      while (i < lines.length && !lines[i].includes("$$")) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].includes("$$")) {
        const remaining = lines[i].replace("$$", "").trim();
        if (remaining) mathLines.push(remaining);
        i++;
      }
      elements.push(<MathBlock key={key++} tex={mathLines.join("\n")} display={true} />);
      continue;
    }

    // Mermaid code block
    if (line.startsWith("```mermaid")) {
      const mermaidLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        mermaidLines.push(lines[i]);
        i++;
      }
      elements.push(<MermaidDiagram key={key++} code={mermaidLines.join("\n")} />);
      i++;
      continue;
    }

    // Regular code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div
          key={key++}
          style={{
            background: "var(--color-obsidian-code-bg)",
            border: "1px solid var(--color-obsidian-border)",
            borderRadius: "6px",
            margin: "12px 0",
            overflow: "hidden",
          }}
        >
          {lang && (
            <div
              style={{
                background: "var(--color-obsidian-surface)",
                padding: "4px 12px",
                fontSize: "0.75em",
                color: "var(--color-obsidian-muted-text)",
                borderBottom: "1px solid var(--color-obsidian-border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: "12px 16px",
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.87em",
              color: "var(--color-obsidian-code-text)",
              lineHeight: 1.6,
            }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Callout block > [!type]
    const calloutMatch = line.match(/^>\s*\[!(\w+)\]([+-])?(.*)$/);
    if (calloutMatch) {
      const calloutType = calloutMatch[1];
      const foldable = calloutMatch[2] === "+" || calloutMatch[2] === "-";
      const defaultFolded = calloutMatch[2] === "-";
      const title = calloutMatch[3]?.trim();
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        contentLines.push(lines[i].slice(1).trim());
        i++;
      }
      elements.push(
        <CalloutBlock
          key={key++}
          type={calloutType}
          title={title}
          content={contentLines.join("\n")}
          foldable={foldable}
          defaultFolded={defaultFolded}
          onWikilinkClick={onWikilinkClick}
        />
      );
      continue;
    }

    // Embed block ![[Note]], ![[Note^blockId]]
    const embedMatch = line.match(/^!\[\[([^\]|^#]+)(?:\^([a-zA-Z0-9_-]+))?(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]$/);
    if (embedMatch) {
      if (embedMatch[2]) {
        elements.push(
          <BlockReference
            key={key++}
            noteTitle={embedMatch[1]}
            blockId={embedMatch[2]}
            notes={notes}
            onNoteClick={onWikilinkClick}
          />
        );
      } else {
        elements.push(
          <EmbedPreview
            key={key++}
            title={embedMatch[1]}
            notes={notes}
            onWikilinkClick={onWikilinkClick}
          />
        );
      }
      i++;
      continue;
    }

    // Footnote definition [^id]: content
    const footnoteDefMatch = line.match(/^\[\^(\w+)\]:\s*(.+)$/);
    if (footnoteDefMatch) {
      footnotes.push({ id: footnoteDefMatch[1], content: footnoteDefMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      elements.push(
        <hr
          key={key++}
          style={{ border: "none", borderTop: "1px solid var(--color-obsidian-border)", margin: "20px 0" }}
        />
      );
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const sizes: Record<number, string> = {
        1: "1.8em",
        2: "1.45em",
        3: "1.2em",
        4: "1.05em",
        5: "0.95em",
        6: "0.9em",
      };
      const margins: Record<number, string> = {
        1: "28px 0 12px",
        2: "24px 0 10px",
        3: "20px 0 8px",
        4: "16px 0 6px",
        5: "14px 0 4px",
        6: "12px 0 4px",
      };
      elements.push(
        React.createElement(
          `h${level}` as keyof JSX.IntrinsicElements,
          {
            key: key++,
            id: text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
            style: {
              fontSize: sizes[level],
              fontWeight: level <= 2 ? 700 : 600,
              color: "var(--color-foreground)",
              margin: margins[level],
              lineHeight: 1.3,
              borderBottom: level === 1 ? "1px solid var(--color-obsidian-border)" : "none",
              paddingBottom: level === 1 ? "8px" : "0",
            },
          },
          parseInline(text, onWikilinkClick, onHoverLink, onHoverEnd, notes)
        )
      );
      i++;
      continue;
    }

    // Blockquote (non-callout)
    if (line.startsWith("> ") && !line.match(/^>\s*\[!/)) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          style={{
            borderLeft: "3px solid var(--color-obsidian-accent)",
            margin: "12px 0",
            padding: "8px 16px",
            background: "var(--color-obsidian-surface)",
            borderRadius: "0 4px 4px 0",
            color: "var(--color-obsidian-muted-text)",
            fontStyle: "italic",
          }}
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} style={{ margin: qi === 0 ? 0 : "6px 0 0" }}>
              {parseInline(ql, onWikilinkClick, onHoverLink, onHoverEnd, notes)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\|?[\s-|]+\|?$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const [headerRow, , ...bodyRows] = tableLines;
      const parseRow = (row: string) =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

      elements.push(
        <div key={key++} style={{ overflowX: "auto", margin: "16px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9em",
              fontFamily: "var(--font-sans)",
            }}
          >
            <thead>
              <tr>
                {parseRow(headerRow).map((cell, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "6px 12px",
                      textAlign: "left",
                      borderBottom: "2px solid var(--color-obsidian-border)",
                      color: "var(--color-foreground)",
                      fontWeight: 600,
                      background: "var(--color-obsidian-surface)",
                    }}
                  >
                    {parseInline(cell, onWikilinkClick, onHoverLink, onHoverEnd, notes)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: "1px solid var(--color-obsidian-border)",
                    background: ri % 2 === 0 ? "transparent" : "var(--color-obsidian-surface)",
                  }}
                >
                  {parseRow(row).map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "6px 12px",
                        color: "var(--color-obsidian-muted-text)",
                      }}
                    >
                      {parseInline(cell, onWikilinkClick, onHoverLink, onHoverEnd, notes)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1]?.length ?? 0;
        const text = lines[i].replace(/^[\s]*[-*+]\s/, "");
        const isTask = text.startsWith("[ ] ") || text.startsWith("[x] ");
        const checked = text.startsWith("[x] ");
        const itemText = isTask ? text.slice(4) : text;
        listItems.push(
          <li
            key={i}
            style={{
              marginLeft: `${indent * 8}px`,
              listStyle: isTask ? "none" : "disc",
              color: "var(--color-obsidian-muted-text)",
              marginBottom: "3px",
            }}
          >
            {isTask && (
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "1.5px solid var(--color-obsidian-accent)",
                  borderRadius: "3px",
                  marginRight: "6px",
                  verticalAlign: "middle",
                  background: checked ? "var(--color-obsidian-accent)" : "transparent",
                  position: "relative",
                  top: -1,
                }}
              />
            )}
            {parseInline(itemText, onWikilinkClick, onHoverLink, onHoverEnd, notes)}
          </li>
        );
        i++;
      }
      elements.push(
        <ul
          key={key++}
          style={{ margin: "8px 0", paddingLeft: "20px", listStyle: "disc" }}
        >
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, "");
        listItems.push(
          <li
            key={i}
            style={{ color: "var(--color-obsidian-muted-text)", marginBottom: "3px" }}
          >
            {parseInline(text, onWikilinkClick, onHoverLink, onHoverEnd, notes)}
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={key++} style={{ margin: "8px 0", paddingLeft: "24px" }}>
          {listItems}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "8px" }} />);
      i++;
      continue;
    }

    // Paragraph (with inline footnote references)
    let processedLine = line.replace(/\[\^(\w+)\]/g, (_, id) => `<fnref>${id}</fnref>`);
    const parts = processedLine.split(/(<fnref>\w+<\/fnref>)/);
    const paraParts: React.ReactNode[] = [];
    parts.forEach((part, pi) => {
      const fnMatch = part.match(/<fnref>(\w+)<\/fnref>/);
      if (fnMatch) {
        paraParts.push(<FootnoteRef key={`fn-${pi}`} id={fnMatch[1]} />);
      } else {
        paraParts.push(...parseInline(part, onWikilinkClick, onHoverLink, onHoverEnd, notes));
      }
    });

    elements.push(
      <p
        key={key++}
        style={{
          margin: "0 0 8px",
          color: "var(--color-obsidian-muted-text)",
          lineHeight: 1.7,
        }}
      >
        {paraParts}
      </p>
    );
    i++;
  }

  // Render footnotes at the end if any
  if (footnotes.length > 0) {
    elements.push(
      <div
        key={key++}
        style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid var(--color-obsidian-border)",
        }}
      >
        <h4
          style={{
            fontSize: "0.85em",
            fontWeight: 600,
            color: "var(--color-obsidian-muted-text)",
            marginBottom: "8px",
          }}
        >
          Footnotes
        </h4>
        {footnotes.map((fn) => (
          <FootnoteBlock key={fn.id} id={fn.id} content={fn.content} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "0.95rem",
        lineHeight: 1.7,
        color: "var(--color-obsidian-muted-text)",
        padding: "0 4px",
      }}
    >
      {elements}
    </div>
  );
}
