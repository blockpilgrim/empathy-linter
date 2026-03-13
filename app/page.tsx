"use client";

import Editor from "@/components/editor";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full max-w-2xl mx-auto px-6 pt-12 pb-6 hero-enter stagger-0">
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
      <section className="w-full max-w-2xl mx-auto px-6 flex-1 hero-enter stagger-1">
        <Editor />
      </section>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto px-6 py-8 hero-enter stagger-2">
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
