# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

To run the ingestion pipeline:
```bash
npx ts-node scripts/ingest.ts
```

## Environment Variables

Create `.env.local` with:
- `DATABASE_URL` — PostgreSQL connection string (requires pgvector extension)
- `GITHUB_TOKEN` — GitHub Personal Access Token (for ingestion script)

## Architecture

This is a **RAG (Retrieval-Augmented Generation) chat app**. The UI is a skeleton; the core logic lives in `lib/` and `scripts/`.

### Data Flow

**Ingestion** (`scripts/ingest.ts`):
1. Fetches `.md`/`.mdx` files from a GitHub repo via GitHub API (currently hardcoded to `supabase/supabase`)
2. Chunks text into 500-char pieces with 50-char overlap
3. Generates embeddings locally with `@xenova/transformers` (model: `Xenova/all-MiniLM-L6-v2`)
4. Stores chunks + vectors in a PostgreSQL `documents` table using pgvector

**Search** (`lib/rag.ts`):
1. Embeds the user query with the same Xenova model
2. Runs a pgvector cosine similarity search (`<=>` operator) against the `documents` table
3. Returns top-K matching chunks with similarity scores

### Key Files

| Path | Role |
|------|------|
| `lib/rag.ts` | `embed(text)` and `search(query, topK)` — the retrieval primitives |
| `scripts/ingest.ts` | One-shot pipeline: GitHub → chunk → embed → Postgres |
| `app/` | Next.js App Router shell (layout, home page — not yet wired to RAG) |

### Stack

- **Next.js 16.2.4** with App Router and React 19 — read `node_modules/next/dist/docs/` before touching Next.js-specific APIs
- **PostgreSQL + pgvector** via `pg` client for vector storage and similarity search
- **@xenova/transformers** for on-device ML inference (no external embedding API)
- **Ollama** (`ollama` package) is a dependency but not yet integrated
- **Tailwind CSS v4** (PostCSS plugin — config differs from v3)
