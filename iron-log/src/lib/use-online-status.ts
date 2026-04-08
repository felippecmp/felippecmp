"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks navigator.onLine via the online/offline events, using
 * useSyncExternalStore — the React 18+ way to subscribe to an external
 * source. SSR and the first client render return `true` so the UI doesn't
 * flash a misleading offline banner.
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
