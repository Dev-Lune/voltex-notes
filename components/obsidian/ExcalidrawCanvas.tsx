"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { Note } from "./data";

interface ExcalidrawCanvasProps {
  note: Note;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
}

export default function ExcalidrawCanvas({
  note,
  onNoteChange,
}: ExcalidrawCanvasProps) {
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Detect theme from CSS variables
  useEffect(() => {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--obs-bg")
      .trim();
    if (bg) {
      const hex = bg.replace("#", "");
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        setDarkMode(r * 0.299 + g * 0.587 + b * 0.114 < 128);
      }
    }
  }, []);

  // Parse initial data from note.drawingData
  const initialData = useMemo(() => {
    try {
      if (note.drawingData) {
        const parsed = JSON.parse(note.drawingData);
        return {
          elements: parsed.elements ?? [],
          appState: parsed.appState ?? {},
          files: parsed.files ?? undefined,
        };
      }
    } catch {
      // ignore parse errors
    }
    return { elements: [], appState: {} };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only parse on mount

  // Debounced save handler
  const handleChange = useCallback(
    (elements: readonly unknown[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const files = excalidrawAPIRef.current?.getFiles?.() ?? {};
        const data = JSON.stringify({
          type: "excalidraw",
          version: 2,
          elements,
          files,
        });
        onNoteChange(note.id, {
          drawingData: data,
          updatedAt: new Date().toISOString().split("T")[0],
        });
      }, 400);
    },
    [note.id, onNoteChange]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        theme={darkMode ? "dark" : "light"}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}
