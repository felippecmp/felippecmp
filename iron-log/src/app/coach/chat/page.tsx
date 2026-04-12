import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ChatInterface } from "./ChatInterface";

export default function CoachChatPage() {
  return (
    <div className="px-6 pt-10 flex flex-col" style={{ minHeight: "calc(100dvh - 6rem)" }}>
      <Link
        href="/coach"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Coach
      </Link>

      <header className="mb-6">
        <h1 className="display text-3xl leading-none">Coach AI</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1.5">
          Pergunte sobre treino — respostas baseadas nos seus dados reais.
        </p>
      </header>

      <ChatInterface />
    </div>
  );
}
