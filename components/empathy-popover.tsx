"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface EmpathyPopoverProps {
  reason: string;
  suggestion: string;
  anchor: DOMRect;
  onClose: () => void;
}

export default function EmpathyPopover({
  reason,
  suggestion,
  anchor,
  onClose,
}: EmpathyPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [position, setPosition] = useState<{
    top: number;
    left: number;
    flipped: boolean;
  }>({ top: 0, left: 0, flipped: false });

  const computePosition = useCallback(() => {
    const popoverEl = ref.current;
    if (!popoverEl) return;

    const popoverRect = popoverEl.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;

    // Default: position below the highlight
    let top = anchor.bottom + gap;
    let flipped = false;

    // Flip above if too close to viewport bottom
    if (top + popoverRect.height > window.innerHeight - viewportPadding) {
      top = anchor.top - popoverRect.height - gap;
      flipped = true;
    }

    // Center horizontally on the highlight, clamped to viewport edges
    let left = anchor.left + anchor.width / 2 - popoverRect.width / 2;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - popoverRect.width - viewportPadding)
    );

    setPosition({ top, left, flipped });
  }, [anchor]);

  // Compute position after initial render (needs the DOM element for dimensions)
  useEffect(() => {
    computePosition();
  }, [computePosition]);

  // Recompute on resize; dismiss on scroll (anchor DOMRect is a snapshot
  // that becomes stale when the document scrolls)
  useEffect(() => {
    const dismissOnScroll = () => onCloseRef.current();
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", dismissOnScroll, true);
    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", dismissOnScroll, true);
    };
  }, [computePosition]);

  // Click-outside and Escape dismiss (Pulp pattern).
  // Uses ref for onClose to avoid re-registering listeners on every render.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Empathy flag detail"
      className="popover-enter fixed z-50 w-[280px] bg-surface border border-border rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{
        top: position.top,
        left: position.left,
        // Start invisible for measurement, then show after position is computed
        visibility: position.top === 0 && position.left === 0 ? "hidden" : "visible",
      }}
    >
      {/* Dismiss button */}
      <div className="flex justify-end p-1 pb-0">
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Dismiss"
          style={{ width: 24, height: 24 }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {/* Reason */}
        <div className="mb-2">
          <p
            className="font-mono text-muted uppercase tracking-[0.08em] mb-1"
            style={{ fontSize: "var(--type-3xs)" }}
          >
            Why this was flagged
          </p>
          <p
            className="text-foreground leading-relaxed"
            style={{ fontSize: "var(--type-xs)" }}
          >
            {reason}
          </p>
        </div>

        {/* Suggestion callout */}
        <div
          className="bg-accent-light rounded-[4px] px-2.5 py-2"
        >
          <p
            className="font-mono text-accent-dark uppercase tracking-[0.08em] mb-1"
            style={{ fontSize: "var(--type-3xs)" }}
          >
            Suggestion
          </p>
          <p
            className="text-foreground leading-relaxed"
            style={{ fontSize: "var(--type-xs)" }}
          >
            {suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}
