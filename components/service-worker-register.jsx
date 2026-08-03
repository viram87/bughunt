"use client";

import { useEffect } from "react";

// Registered from a client component rather than inline script so it stays
// out of the critical path. Development is excluded: a service worker
// caching a dev build makes hot reload behave unpredictably, and we've
// already lost time to phantom caching issues on this project.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing is not worth surfacing — the site works
        // exactly as before without it.
      });
    };

    // Wait for load so registration never competes with first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
