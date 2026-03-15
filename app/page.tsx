"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parsePartialJson } from "ai";
import type { Editor as TipTapEditor } from "@tiptap/react";
import Editor from "@/components/editor";
import EmpathyPopover from "@/components/empathy-popover";
import { DEMO_CONTENT, DEMO_FLAGS } from "@/lib/demo-content";
import { applyFlags, clearEmpathyMarks, applyFlagsIncremental } from "@/lib/apply-flags";
import { DEBOUNCE_MS } from "@/lib/config";
import type { EmpathyFlagInput } from "@/lib/schemas";

interface PopoverState {
  anchor: DOMRect;
  reason: string;
  suggestion: string;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const editorRef = useRef<TipTapEditor | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const demoFlagsApplied = useRef(false);

  // Refs for ambient scanning pipeline (don't trigger re-renders)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const lastAnalyzedTextRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up timer and in-flight request on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  /** Cancel any in-flight analysis request and pending debounce timer. */
  const cancelPendingAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    clearTimeout(debounceTimerRef.current);
  }, []);

  // Event delegation: listen for clicks on .empathy-highlight spans
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(
        ".empathy-highlight"
      ) as HTMLElement | null;
      if (!target) return;

      const reason = target.getAttribute("data-reason") || "";
      const suggestion = target.getAttribute("data-suggestion") || "";
      if (!reason && !suggestion) return;

      const anchor = target.getBoundingClientRect();
      setPopover({ anchor, reason, suggestion });
    };

    wrapper.addEventListener("click", handleClick);
    return () => wrapper.removeEventListener("click", handleClick);
  }, []);

  /**
   * Fetch /api/lint with the given text and progressively apply flags
   * as the streamed JSON arrives. Uses parsePartialJson to reconstruct
   * partial objects from the text stream chunks.
   */
  const analyzeText = useCallback(async (text: string) => {
    // Abort any in-flight request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Non-2xx response — log and bail. Don't throw to avoid noisy errors
        // when the user hits rate limits or sends invalid input.
        console.error("Lint API error:", response.status);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";
      let previousFlagCount = 0;
      let marksCleared = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        // Parse the accumulated JSON text as a partial object.
        // The server streams text chunks that, when concatenated, form
        // the full JSON object { flags: [...] }. parsePartialJson can
        // reconstruct partial results mid-stream.
        const { value: parsed, state } = await parsePartialJson(accumulated);

        if (
          (state === "successful-parse" || state === "repaired-parse") &&
          parsed &&
          typeof parsed === "object" &&
          "flags" in parsed
        ) {
          const result = parsed as Record<string, unknown>;
          if (!Array.isArray(result.flags)) continue;

          const partialFlags = result.flags as Partial<EmpathyFlagInput>[];

          // Filter to complete flags to avoid marks with undefined metadata.
          const completeFlags = partialFlags.filter(
            (f): f is EmpathyFlagInput =>
              !!f.exact_phrase && !!f.reason && !!f.suggestion
          );

          const editor = editorRef.current;
          if (editor && completeFlags.length > previousFlagCount) {
            // Clear old marks once on first new flag — deferred from response
            // start so old highlights stay visible if the stream errors before
            // producing any flags.
            if (!marksCleared) {
              setPopover(null);
              clearEmpathyMarks(editor);
              marksCleared = true;
            }

            // Apply only NEW flags incrementally — avoids removing and
            // re-applying all marks on every streaming chunk.
            const newFlags = completeFlags.slice(previousFlagCount);
            previousFlagCount = completeFlags.length;
            applyFlagsIncremental(editor, newFlags);
          }
        }
      }

    } catch (err: unknown) {
      // AbortError is expected when we cancel a stale request — ignore it
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Analysis failed:", err);
    } finally {
      // Only clear analyzing state if this controller is still the active one
      // (a newer request may have already replaced it)
      if (abortControllerRef.current === controller) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  /**
   * Called on every editor update (keystroke, paste, etc.).
   * Resets the debounce timer. When the timer fires, triggers analysis
   * if the text has changed since the last analysis.
   */
  const handleTextUpdate = useCallback(
    (text: string) => {
      // Auto-dismiss popover when user starts typing
      setPopover(null);

      clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        // Guard: skip if text hasn't changed since last analysis
        if (text === lastAnalyzedTextRef.current) return;
        lastAnalyzedTextRef.current = text;

        analyzeText(text);
      }, DEBOUNCE_MS);
    },
    [analyzeText]
  );

  const handleEditorReady = useCallback((editor: TipTapEditor) => {
    editorRef.current = editor;

    // Apply pre-computed demo flags on initial mount for instant highlights.
    // Guard against double-application (React strict mode calls effects twice).
    if (!demoFlagsApplied.current) {
      demoFlagsApplied.current = true;
      applyFlags(editor, DEMO_FLAGS);

      // Store demo text as the last analyzed text so the debounce guard
      // doesn't re-analyze the pre-loaded content unnecessarily.
      lastAnalyzedTextRef.current = editor.getText();
    }
  }, []);

  /**
   * Clear the editor: remove all content, flags, and reset analysis state.
   */
  const handleClear = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    cancelPendingAnalysis();

    // clearContent() triggers onUpdate synchronously, which restarts the
    // debounce timer. Setting lastAnalyzedTextRef to "" first ensures the
    // debounce guard skips re-analysis of empty content.
    lastAnalyzedTextRef.current = "";
    editor.commands.clearContent();
    setPopover(null);
  }, []);

  /**
   * Reset to demo content: re-insert the demo text and apply pre-computed flags.
   */
  const handleReset = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    cancelPendingAnalysis();

    // setContent() triggers onUpdate synchronously, which restarts the
    // debounce timer. Seed the text-change guard after setContent so the
    // debounce guard skips re-analysis of restored demo content.
    editor.commands.setContent(DEMO_CONTENT);
    lastAnalyzedTextRef.current = editor.getText();
    applyFlags(editor, DEMO_FLAGS);
    setPopover(null);
  }, []);

  return (
    <main className="min-h-screen flex flex-col w-full max-w-2xl mx-auto px-6">
      {/* Header */}
      <header className="pt-12 pb-6 hero-enter stagger-0">
        <h1
          className="font-mono text-foreground-secondary tracking-[0.08em] uppercase"
          style={{ fontSize: "var(--type-2xs)" }}
        >
          Empathy Linter
        </h1>
        <p
          className="text-muted mt-1"
          style={{ fontSize: "var(--type-base)" }}
        >
          Scan your docs for assumed knowledge, unexplained jargon, and missing
          context.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleClear}
            style={{ fontSize: "var(--type-2xs)" }}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleReset}
            style={{ fontSize: "var(--type-2xs)" }}
          >
            Try demo text
          </button>
        </div>
      </header>

      {/* Editor */}
      <section ref={editorWrapperRef} className="flex-1 hero-enter stagger-1">
        <Editor
          content={DEMO_CONTENT}
          onUpdate={handleTextUpdate}
          onEditorReady={handleEditorReady}
        />
      </section>

      {/* Empathy flag popover */}
      {popover && (
        <EmpathyPopover
          reason={popover.reason}
          suggestion={popover.suggestion}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
        />
      )}

      {/* Footer with loading indicator */}
      <footer className="py-8 hero-enter stagger-2">
        <div className="flex items-center gap-3">
          <p
            className="font-mono text-muted-light tracking-[0.04em]"
            style={{ fontSize: "var(--type-3xs)" }}
          >
            Advocating for the reader.
          </p>
          {isAnalyzing && (
            <div className="flex items-center gap-1" role="status" aria-label="Analyzing text">
              <span className="loading-dot" />
              <span className="loading-dot" style={{ animationDelay: "0.2s" }} />
              <span className="loading-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}
