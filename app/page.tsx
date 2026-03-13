"use client";

import { useState, useCallback, useRef } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import Editor from "@/components/editor";
import { DEMO_CONTENT, DEMO_FLAGS } from "@/lib/demo-content";
import { applyFlags } from "@/lib/apply-flags";
import type { EmpathyFlagInput } from "@/lib/schemas";

export default function Home() {
  const [flags, setFlags] = useState<EmpathyFlagInput[]>([]);
  const editorRef = useRef<TipTapEditor | null>(null);
  const demoFlagsApplied = useRef(false);

  const handleEditorReady = useCallback((editor: TipTapEditor) => {
    editorRef.current = editor;

    // Apply pre-computed demo flags on initial mount for instant highlights.
    // Guard against double-application (React strict mode calls effects twice).
    if (!demoFlagsApplied.current) {
      demoFlagsApplied.current = true;
      applyFlags(editor, DEMO_FLAGS);
      setFlags(DEMO_FLAGS);
    }
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
      </header>

      {/* Editor */}
      <section className="flex-1 hero-enter stagger-1">
        <Editor
          content={DEMO_CONTENT}
          onEditorReady={handleEditorReady}
        />
      </section>

      {/* Footer */}
      <footer className="py-8 hero-enter stagger-2">
        <p
          className="font-mono text-muted-light tracking-[0.04em]"
          style={{ fontSize: "var(--type-3xs)" }}
        >
          Advocating for the reader.
        </p>
      </footer>
    </main>
  );
}
