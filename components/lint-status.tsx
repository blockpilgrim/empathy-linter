"use client";

import { useState, useEffect, useRef } from "react";

const STATUS_PHRASES = [
  "Scanning for jargon",
  "Reading between the lines",
  "Empathizing with the reader",
  "Questioning assumptions",
  "Pondering context",
  "Hunting acronyms",
  "Thinking like a beginner",
  "Untangling terminology",
  "Channeling fresh eyes",
  "Considering the newcomer",
  "Inspecting for clarity",
  "Advocating for understanding",
  "Scrutinizing shortcuts",
  "Parsing prose",
  "Double-checking definitions",
  "Putting on reading glasses",
  "Examining explanations",
  "Checking for blind spots",
  "Mulling it over",
  "Looking for assumed knowledge",
];

/** Shuffle array in-place (Fisher-Yates) and return it. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const CYCLE_MS = 2500;

export default function LintStatus() {
  const [phrase, setPhrase] = useState(() => STATUS_PHRASES[0]);
  const [visible, setVisible] = useState(true);
  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    // Seed the queue with a shuffled copy (skip current phrase to avoid immediate repeat)
    queueRef.current = shuffle(
      STATUS_PHRASES.filter((p) => p !== phrase)
    );

    timerRef.current = setInterval(() => {
      // Start crossfade-out
      setVisible(false);

      // After fade-out, swap text and fade back in
      setTimeout(() => {
        if (queueRef.current.length === 0) {
          queueRef.current = shuffle([...STATUS_PHRASES]);
        }
        setPhrase(queueRef.current.pop()!);
        setVisible(true);
      }, 200); // matches CSS transition duration
    }, CYCLE_MS);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-label="Analyzing text"
    >
      <span className="lint-spinner" />
      <span
        className="font-mono text-muted tracking-[0.04em] lint-status-text"
        style={{
          fontSize: "var(--type-2xs)",
          opacity: visible ? 1 : 0,
        }}
      >
        {phrase}…
      </span>
    </div>
  );
}
