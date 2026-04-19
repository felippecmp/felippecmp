"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Lightweight click-tooltip — wraps a trigger element and renders a popover
 * above it on click/tap. Backdrop click closes. Useful for volume bar
 * annotations, set status explanations, and other "tap-to-explain" affordances.
 *
 * Ported from the v2 handoff (interactions.jsx → Tooltip).
 */
export function Tooltip({
  trigger,
  content,
}: {
  trigger: ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  content: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const triggerWithToggle = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen((v) => !v);
          trigger.props.onClick?.(e);
        },
      })
    : trigger;

  return (
    <span className="relative inline-flex">
      {triggerWithToggle}
      {open && (
        <>
          <span
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[99]"
            aria-hidden="true"
          />
          <span
            role="tooltip"
            className="absolute bottom-[calc(100%+8px)] left-1/2 z-[100] -translate-x-1/2 min-w-[180px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-hover)] px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            style={{ animation: "tlog-pop-in 0.2s ease-out" }}
          >
            {content}
          </span>
        </>
      )}
    </span>
  );
}
