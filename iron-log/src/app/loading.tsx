/**
 * Global loading skeleton. Displayed by Next.js while a page's async
 * data is being fetched. Prevents the blank-screen flash that makes
 * PWAs feel "webby" instead of native.
 */
export default function Loading() {
  return (
    <div className="px-6 pt-10 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-3 w-16 rounded bg-[var(--border)] mb-2" />
        <div className="h-9 w-48 rounded-lg bg-[var(--border)]" />
        <div className="h-3 w-32 rounded bg-[var(--border)] mt-2" />
      </div>

      {/* Card skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-5">
        <div className="h-3 w-24 rounded bg-[var(--border)] mb-3" />
        <div className="h-8 w-40 rounded-lg bg-[var(--border)] mb-4" />
        <div className="h-12 w-full rounded-xl bg-[var(--border)]" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5"
          >
            <div className="h-2.5 w-12 rounded bg-[var(--border)] mb-2" />
            <div className="h-6 w-8 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] last:border-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--border)]" />
            <div className="flex-1">
              <div className="h-4 w-36 rounded bg-[var(--border)] mb-1.5" />
              <div className="h-3 w-24 rounded bg-[var(--border)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
