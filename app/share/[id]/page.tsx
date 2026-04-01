"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

interface SharedNote {
  title: string;
  content: string;
  type: string;
  sharedBy: string;
  sharedAt: string;
}

export default function SharedNotePage() {
  const params = useParams();
  const shareId = params.id as string;
  const [note, setNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;
    (async () => {
      try {
        const { getFirebaseDb } = await import("@/lib/firebase/config");
        const { doc, getDoc } = await import("firebase/firestore");
        const db = getFirebaseDb();
        if (!db) {
          setError("Unable to connect to database");
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, "shared", shareId));
        if (!snap.exists()) {
          setError("This shared note does not exist or has been removed.");
          setLoading(false);
          return;
        }
        const data = snap.data();
        setNote({
          title: data.title || "Untitled",
          content: data.content || "",
          type: data.type || "markdown",
          sharedBy: data.sharedByName || "Anonymous",
          sharedAt: data.sharedAt || "",
        });
      } catch {
        setError("Failed to load shared note.");
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117", color: "#e0e0e0" }}>
        <div className="flex items-center gap-3 text-lg">
          <Loader2 size={24} className="animate-spin" style={{ color: "#3b8ef5" }} />
          Loading shared note…
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117", color: "#e0e0e0" }}>
        <div className="text-center max-w-md px-6">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#f38ba8" }} />
          <h1 className="text-xl font-semibold mb-2">Note Not Found</h1>
          <p className="text-sm mb-6" style={{ color: "#888" }}>
            {error || "This shared note does not exist or has been removed."}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "#3b8ef5", color: "#fff" }}
          >
            Open Voltex Notes
          </a>
        </div>
      </div>
    );
  }

  // Simple markdown-to-HTML rendering for shared notes
  const renderContent = (md: string) => {
    const lines = md.split("\n");
    const html: string[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = "";

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          html.push(`<pre class="shared-code"><code class="language-${codeLang}">${codeContent.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`);
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = line.slice(3).trim();
        }
        continue;
      }
      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }
      if (line.startsWith("# ")) {
        html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      } else if (line.startsWith("## ")) {
        html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      } else if (line.startsWith("### ")) {
        html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      } else if (line.startsWith("- [ ] ")) {
        html.push(`<div class="shared-task"><input type="checkbox" disabled /><span>${escapeHtml(line.slice(6))}</span></div>`);
      } else if (line.startsWith("- [x] ")) {
        html.push(`<div class="shared-task"><input type="checkbox" checked disabled /><span style="text-decoration:line-through;opacity:0.6">${escapeHtml(line.slice(6))}</span></div>`);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      } else if (line.startsWith("> ")) {
        html.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
      } else if (line.startsWith("---")) {
        html.push(`<hr />`);
      } else if (line.trim() === "") {
        html.push(`<br />`);
      } else {
        html.push(`<p>${inlineFormat(line)}</p>`);
      }
    }
    return html.join("\n");
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inlineFormat = (s: string) => {
    let out = escapeHtml(s);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
    out = out.replace(/`(.+?)`/g, '<code class="shared-inline-code">$1</code>');
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return out;
  };

  const formattedDate = note.sharedAt
    ? new Date(note.sharedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen" style={{ background: "#0f1117", color: "#e0e0e0" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "#0f1117ee", borderBottom: "1px solid #1e2030", backdropFilter: "blur(12px)" }}
      >
        <a href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: "#3b8ef5" }}>
          <FileText size={16} />
          Voltex Notes
        </a>
        <a
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
          style={{ background: "#3b8ef5", color: "#fff" }}
        >
          <ExternalLink size={12} />
          Open in Voltex
        </a>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#fff" }}>{note.title}</h1>
        <p className="text-xs mb-8" style={{ color: "#666" }}>
          Shared by {note.sharedBy}{formattedDate ? ` · ${formattedDate}` : ""}
        </p>
        <article
          className="shared-note-content"
          dangerouslySetInnerHTML={{ __html: renderContent(note.content) }}
        />
      </main>

      {/* Styles */}
      <style>{`
        .shared-note-content h1 { font-size: 1.8rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: #fff; }
        .shared-note-content h2 { font-size: 1.4rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: #e0e0e0; }
        .shared-note-content h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #ccc; }
        .shared-note-content p { margin: 0.5rem 0; line-height: 1.7; color: #c0c0c0; }
        .shared-note-content li { margin: 0.25rem 0 0.25rem 1.5rem; list-style: disc; color: #c0c0c0; }
        .shared-note-content blockquote { border-left: 3px solid #3b8ef5; padding: 0.5rem 1rem; margin: 0.75rem 0; color: #999; font-style: italic; }
        .shared-note-content hr { border: none; border-top: 1px solid #1e2030; margin: 1.5rem 0; }
        .shared-note-content a { color: #3b8ef5; text-decoration: underline; }
        .shared-note-content a:hover { opacity: 0.8; }
        .shared-code { background: #161822; border: 1px solid #1e2030; border-radius: 8px; padding: 1rem; margin: 0.75rem 0; overflow-x: auto; font-size: 0.85rem; color: #c0c0c0; }
        .shared-inline-code { background: #161822; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; color: #3b8ef5; }
        .shared-task { display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0; color: #c0c0c0; }
        .shared-task input { accent-color: #3b8ef5; }
      `}</style>
    </div>
  );
}
