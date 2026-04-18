"use client";

import React, { useEffect, useRef, useId } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";

export type ConfirmTone = "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Optional second-tier confirmation requiring the user to type the typed value */
  requireTypedConfirmation?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation dialog. Replaces native `window.confirm()`.
 * - role="alertdialog" with proper aria-labelledby/aria-describedby
 * - traps initial focus on cancel (safer default)
 * - closes on Escape
 * - clicking the backdrop cancels
 * - optional "type to confirm" guard for destructive actions
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  requireTypedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = React.useState("");

  // Reset typed value whenever dialog reopens
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  // Focus management + escape + basic focus trap
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Default focus to cancel — safer for destructive prompts
    setTimeout(() => cancelRef.current?.focus(), 0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        // Simple trap between cancel + confirm
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const palette = {
    danger: {
      icon: Trash2,
      ring: "rgba(243,139,168,0.18)",
      iconBg: "rgba(243,139,168,0.12)",
      iconColor: "#f38ba8",
      btnBg: "#f38ba8",
      btnHover: "#eb6f93",
    },
    warning: {
      icon: AlertTriangle,
      ring: "rgba(249,226,175,0.18)",
      iconBg: "rgba(249,226,175,0.12)",
      iconColor: "#f9e2af",
      btnBg: "#f9e2af",
      btnHover: "#e5cf91",
    },
    info: {
      icon: Info,
      ring: "rgba(137,180,250,0.18)",
      iconBg: "rgba(137,180,250,0.12)",
      iconColor: "#89b4fa",
      btnBg: "var(--color-obsidian-accent)",
      btnHover: "var(--color-obsidian-accent-soft)",
    },
  }[tone];
  const Icon = palette.icon;

  const typedOk = !requireTypedConfirmation || typed.trim() === requireTypedConfirmation;
  const confirmDisabled = !typedOk;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", animation: "fadeIn 0.15s ease" }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 6px ${palette.ring}`,
          animation: "scaleIn 0.18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: palette.iconBg }}
              aria-hidden="true"
            >
              <Icon size={20} style={{ color: palette.iconColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base font-semibold leading-tight"
                style={{ color: "var(--color-obsidian-text)" }}
              >
                {title}
              </h2>
              {description && (
                <div
                  id={descId}
                  className="mt-1.5 text-sm leading-relaxed"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  {description}
                </div>
              )}
            </div>
          </div>

          {requireTypedConfirmation && (
            <div className="mt-4 ml-[60px]">
              <label
                className="text-xs font-medium block mb-1.5"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                Type{" "}
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{ background: "var(--color-obsidian-bg)", color: palette.iconColor }}
                >
                  {requireTypedConfirmation}
                </code>{" "}
                to confirm
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedOk) onConfirm();
                }}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: `1px solid ${typedOk ? "var(--color-obsidian-border)" : palette.iconColor}`,
                  color: "var(--color-obsidian-text)",
                }}
              />
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{
            background: "var(--color-obsidian-bg)",
            borderTop: "1px solid var(--color-obsidian-border)",
          }}
        >
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: "var(--color-obsidian-text)",
              background: "var(--color-obsidian-surface-2)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => { if (!confirmDisabled) onConfirm(); }}
            disabled={confirmDisabled}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: confirmDisabled ? "var(--color-obsidian-surface-2)" : palette.btnBg,
              color: confirmDisabled ? "var(--color-obsidian-muted-text)" : tone === "warning" ? "#1a1a1a" : "#fff",
              cursor: confirmDisabled ? "not-allowed" : "pointer",
              opacity: confirmDisabled ? 0.6 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
