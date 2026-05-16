"use client";

// src/app/(marketing)/pitch/ThemeToggle.tsx — Cobraya pitch v3 (2026-05-16)
//
// Client component. Flips data-pitch-theme on the nearest .pitch-root wrapper
// and persists the user's choice in localStorage under "cobraya-theme".
//
// Why not <html data-theme>? Because the root layout is shared with the whole
// app (luma palette). We scope theme variables to .pitch-root so the wine+gold
// palette stays inside /pitch and never leaks into auth/marketing/app routes.

import { useEffect, useState } from "react";

type PitchTheme = "dark" | "light";

const STORAGE_KEY = "cobraya-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<PitchTheme>("dark");

  // On mount: hydrate from localStorage (default = dark, matches the design
  // source where <html data-theme="dark">).
  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as PitchTheme | null)
      : null);
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("dark");
    }
  }, []);

  function applyTheme(next: PitchTheme) {
    if (typeof document === "undefined") return;
    const root = document.querySelector<HTMLElement>(".pitch-root");
    if (root) root.setAttribute("data-pitch-theme", next);
  }

  function toggle() {
    const next: PitchTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, etc.) — ignore, theme still flips
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label="Cambiar tema"
    >
      <svg
        className="sun"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        className="moon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
