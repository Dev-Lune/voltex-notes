"use client";

import React, { useEffect, useState } from "react";
import { Monitor, X } from "lucide-react";

const STORAGE_KEY = "voltex-mobile-hint-dismissed";

export default function MobileDesktopHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        // Defer one tick so it doesn't fight the welcome modal
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="show-mobile-only fixed left-3 right-3 z-[120] flex items-start gap-2 rounded-xl px-3 py-2.5"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        animation: "slideUpHint 0.32s cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "color-mix(in srgb, var(--color-obsidian-accent) 14%, transparent)" }}
      >
        <Monitor size={16} style={{ color: "var(--color-obsidian-accent)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold leading-snug" style={{ color: "var(--color-obsidian-text)" }}>
          More on desktop
        </div>
        <div className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Plugins, the pet companion, multi-vault, and the full editor live on the
          <a href="/#download" className="underline ml-1" style={{ color: "var(--color-obsidian-accent)" }}>desktop app</a>.
        </div>
      </div>
      <button
        onClick={dismiss}
        className="p-1 rounded-md tap-target"
        aria-label="Dismiss desktop hint"
        style={{ color: "var(--color-obsidian-muted-text)" }}
      >
        <X size={14} />
      </button>
      <style jsx>{`
        @keyframes slideUpHint {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
