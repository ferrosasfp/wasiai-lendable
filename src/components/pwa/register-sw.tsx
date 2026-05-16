"use client";

import { useEffect } from "react";

/**
 * Manual Service Worker registration for App Router.
 *
 * `@ducanh2912/next-pwa` was designed for Pages Router and auto-injects the
 * registration script via `_app.tsx`. With Next.js App Router there is no
 * `_app.tsx`, so the plugin generates `public/sw.js` correctly but never
 * registers it on the client. Result: PWA installability fails because no
 * controlled SW exists.
 *
 * Pattern from luma-ai (LUM-19): a Client Component mounted in the root
 * layout that calls `navigator.serviceWorker.register('/sw.js')` once on mount.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        // Swallow — SW failure must never block the page from rendering.
        if (process.env.NODE_ENV === "development") {
          console.error("[Cobraya SW] registration failed:", err);
        }
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
