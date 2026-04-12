"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, X, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const DURATION_MS = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(t.id), 200);
    }, DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, [t.id, onDismiss]);

  const Icon =
    t.variant === "error"
      ? AlertTriangle
      : t.variant === "success"
        ? Check
        : Check;

  const iconColor =
    t.variant === "error"
      ? "text-[var(--danger)]"
      : t.variant === "success"
        ? "text-[var(--status-ready)]"
        : "text-[var(--text-soft)]";

  return (
    <div
      className={`pointer-events-auto max-w-sm w-[calc(100%-2rem)] mx-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-lg backdrop-blur-xl ${
        exiting ? "animate-toast-out" : "animate-toast-in"
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon size={14} strokeWidth={2.25} className={`shrink-0 ${iconColor}`} />
      <p className="text-sm text-[var(--text)] flex-1 min-w-0">{t.message}</p>
      <button
        type="button"
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(t.id), 200);
        }}
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        aria-label="Dispensar"
      >
        <X size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
