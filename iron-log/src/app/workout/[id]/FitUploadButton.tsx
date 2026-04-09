"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Upload } from "lucide-react";

type Props = {
  sessionId: string;
  hasExisting: boolean;
};

/**
 * File-picker button that POSTs a .FIT file to
 * /api/workout/[id]/fit and triggers a router refresh so the HR pills
 * re-render with the parsed aggregates.
 */
export function FitUploadButton({ sessionId, hasExisting }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSelect() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setDone(false);

    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch(`/api/workout/${sessionId}/fit`, {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as
          | { ok: true }
          | { ok: false; error: string };
        if (!res.ok || !data.ok) {
          setError("error" in data ? data.error : "Falha no upload.");
          return;
        }
        setDone(true);
        router.refresh();
      } catch {
        setError("Erro de rede. Tente de novo.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".fit,application/octet-stream"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleSelect}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            Processando FIT…
          </>
        ) : done ? (
          <>
            <Check size={14} strokeWidth={2} />
            Dados do Coros carregados
          </>
        ) : (
          <>
            <Upload size={14} strokeWidth={1.75} />
            {hasExisting ? "Substituir arquivo Coros" : "Anexar arquivo Coros"}
          </>
        )}
      </button>
      {error && (
        <p className="text-[11px] text-[var(--danger)] mt-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
