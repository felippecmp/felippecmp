"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

export function CardioFitUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startTransition] = useTransition();

  function handleSelect() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/cardio/fit", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as
          | { ok: true; id: string }
          | { ok: false; error: string };
        if (!res.ok || !data.ok) {
          setError("error" in data ? data.error : "Falha no upload.");
          return;
        }
        router.push(`/cardio/${data.id}`);
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
        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-4 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" strokeWidth={2} />
            Processando FIT…
          </>
        ) : (
          <>
            <Upload size={16} strokeWidth={2} />
            Selecionar arquivo
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-[var(--danger)] mt-3 text-center">
          {error}
        </p>
      )}
      <p className="text-[11px] text-[var(--text-dim)] mt-4 text-center leading-relaxed">
        Arquivo aceito: .fit até 5 MB.
      </p>
    </div>
  );
}
