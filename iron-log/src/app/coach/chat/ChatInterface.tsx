"use client";

import { useRef, useState } from "react";
import { Brain, Loader2, Send } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erro: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Falha na conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4 no-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] mb-4">
              <Brain size={24} strokeWidth={1.5} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto">
              Pergunte qualquer coisa sobre seu treino. O coach tem acesso ao seu
              histórico de sessões, volume, progressão e templates.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-[var(--accent-fg)] rounded-br-md"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-soft)] rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 rounded-bl-md">
              <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 pb-2 border-t border-[var(--border)]">
        <div className="flex items-end gap-2">
          <label htmlFor="coach-chat-input" className="sr-only">
            Pergunta para o coach
          </label>
          <textarea
            id="coach-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao coach..."
            rows={1}
            maxLength={2000}
            className="flex-1 min-h-[44px] max-h-32 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
