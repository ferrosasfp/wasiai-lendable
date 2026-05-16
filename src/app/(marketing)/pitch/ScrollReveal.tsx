"use client";

// src/app/(marketing)/pitch/ScrollReveal.tsx — Cobraya pitch v3 (2026-05-16)
//
// Client component. Single mount, no DOM. Wires an IntersectionObserver to
// every element with [data-rev] inside .pitch-root and adds `is-in` when the
// element enters the viewport. Mirrors the design source's reveal script.
//
// Threshold + rootMargin chosen to match the design (0.12 / -60px bottom).

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const root =
      document.querySelector<HTMLElement>(".pitch-root") ?? document.body;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-rev]"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    for (const el of els) io.observe(el);

    return () => io.disconnect();
  }, []);

  return null;
}
