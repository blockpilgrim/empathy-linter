# Empathy Linter

AI-powered tool that scans technical documentation for assumed knowledge, unexplained jargon, and missing context — advocating for the reader's comprehension.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) on Vercel
- **Editor:** TipTap (ProseMirror-based) with custom inline Mark extension
- **AI:** Vercel AI SDK + Anthropic API (Claude Sonnet)
- **Styling:** Tailwind CSS v4, CSS custom properties

## How It Works

1. Write or paste technical documentation into the editor
2. The system automatically analyzes text for empathy gaps (debounced, ambient)
3. Flagged phrases are highlighted inline
4. Click a highlight to see why it was flagged and how to improve it

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local`. See `.env.example`.
