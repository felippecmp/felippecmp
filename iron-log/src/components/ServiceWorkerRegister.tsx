"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js on mount. Rendered inside RootLayout so it runs on every
 * page. Silent on failure — offline support is additive.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        // When a new SW takes over, let it activate immediately on the next
        // navigation — avoids users staying on stale bundles.
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (
              next.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              next.postMessage?.("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        // Registration can fail on insecure origins / unsupported browsers.
        // Ignored on purpose.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
