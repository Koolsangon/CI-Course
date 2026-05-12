"use client";

import { useEffect } from "react";

/**
 * Registers the minimal SW on mount. Safe no-op in dev and on browsers
 * without SW support (Safari incognito, old Android WebView).
 */
export default function ServiceWorkerBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Swallow: offline is a nice-to-have, not a hard requirement for v1.0.
      });
  }, []);
  return null;
}
