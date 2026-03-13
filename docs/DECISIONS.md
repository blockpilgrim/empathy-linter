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
