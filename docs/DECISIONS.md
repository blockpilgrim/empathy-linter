# Architecture Decisions

Record of significant architectural decisions made during implementation.

---

## AD-001: Manual project setup instead of create-next-app

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** Set up the Next.js project manually (package.json, tsconfig, etc.) rather than using `npx create-next-app@latest`.
**Rationale:** The repo already had git history, docs, and config files. `create-next-app` would overwrite existing files and introduce unwanted boilerplate. Manual setup gives full control over the initial structure.

## AD-002: Teal/sage accent palette instead of Pulp's burnt sienna

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** Use `--accent: #2a7d6e` (teal/sage green) instead of Pulp's `--accent: #b5451b` (burnt sienna).
**Rationale:** Differentiates the product visually from the reference project while conveying a calmer, more "empathetic" tone. Kept the warm paper background (`#f5f1eb`) from Pulp for continuity.

## AD-003: Skip dark mode for v1

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** No dark mode palette or toggle in the initial build.
**Rationale:** Time constraint (1-day timebox). The light paper aesthetic is core to the demo experience. Dark mode can be added post-MVP by porting Pulp's `[data-theme="dark"]` approach.

## AD-004: TipTap Mark (not Node) for empathy highlights

**Date:** 2026-03-13
**Phase:** 1B (Custom Empathy Highlight Extension)
**Decision:** Use a TipTap `Mark` extension (inline `<span>`) instead of a `Node` extension (block-level element) for empathy highlights.
**Rationale:** Pulp's `ProvocationExtension` is a block-level atom node that inserts standalone blocks between paragraphs. The empathy linter needs inline phrase-level highlights that wrap existing text without modifying document structure. Marks are the correct ProseMirror primitive for this — they decorate text ranges rather than creating new content. Key behavioral properties: `inclusive: false` prevents highlight spreading at boundaries, `excludes: "empathyFlag"` prevents overlapping marks.
