"use client";

import { useCallback, useEffect, useState } from "react";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * A collapsible panel state, remembered per key in localStorage, with an
 * optional keyboard shortcut (ignored while typing).
 */
export function useCollapsed(key: string, shortcut?: string, initial = false) {
  const [collapsed, setCollapsed] = useState(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`collapsed:${key}`);
      if (raw !== null) setCollapsed(raw === "1");
    } catch {
      // storage unavailable
    }
  }, [key]);

  const set = useCallback(
    (value: boolean) => {
      setCollapsed(value);
      try {
        window.localStorage.setItem(`collapsed:${key}`, value ? "1" : "0");
      } catch {
        // storage unavailable
      }
    },
    [key]
  );

  const toggle = useCallback(() => set(!collapsed), [collapsed, set]);

  useEffect(() => {
    if (!shortcut) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (TEXT_TAGS.has(el.tagName) || el.isContentEditable)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcut, toggle]);

  return { collapsed, setCollapsed: set, toggle };
}
