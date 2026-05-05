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
- `HUGGINGFACE_API_KEY` — HuggingFace token for embedding and reranking API calls
- `GROQ_API_KEY` — Groq API key for LLM inference (model: `llama-3.3-70b-versatile`)

## Architecture

This is a **RAG (Retrieval-Augmented Generation) chat app** over Supabase documentation, with a streaming chat UI.

### Data Flow

**Ingestion** (`scripts/ingest.ts`):
1. Fetches `.md`/`.mdx` files recursively from `supabase/supabase` on GitHub (`apps/docs/content`)
2. Chunks text by markdown heading sections (splitting on `^#{1,3} `), then by paragraph if a section exceeds 1500 chars
3. Generates embeddings via HuggingFace Inference API (`BAAI/bge-base-en-v1.5`)
4. Stores chunks + vectors in PostgreSQL `documents` table with a `fts` tsvector column

**Search** (`lib/rag.ts`):
1. Embeds the user query via HuggingFace (`BAAI/bge-base-en-v1.5`)
2. Runs **hybrid retrieval**: pgvector cosine similarity (`<=>`) combined with BM25 full-text (`fts @@ plainto_tsquery`), weighted 0.7/0.3, threshold `vector_score > 0.3`, top-10
3. Reranks results via HuggingFace (`BAAI/bge-reranker-base`) and returns top-3

**Chat API** (`app/api/chat/route.ts`):
1. Calls `search(question, 10)` then `rerank(question, chunks)` to get top-3 context chunks
2. Builds a system prompt that injects numbered source excerpts and instructs citation
3. Streams the Groq response back as `text/plain`; appends a `__SOURCES__` sentinel at stream end carrying JSON source metadata

**UI** (`app/page.tsx`):
- Reads the streaming response and splits on `__SOURCES__` to display inline source chips
- Starter question cards and sidebar with pinned doc links

### Key Files

| Path | Role |
|------|------|
| `lib/rag.ts` | `embed()`, `rerank()`, `search()` — retrieval primitives |
| `scripts/ingest.ts` | One-shot pipeline: GitHub → chunk → embed → Postgres |
| `app/api/chat/route.ts` | POST handler: RAG → Groq streaming → source sentinel |
| `app/page.tsx` | Full chat UI — stream parsing, source chips, sidebar |

### Stack

- **Next.js 16.2.4** with App Router and React 19 — read `node_modules/next/dist/docs/` before touching Next.js-specific APIs
- **PostgreSQL + pgvector** via `pg` client; `documents` table has `embedding vector`, `fts tsvector`, `content`, `source`, `filename` columns
- **HuggingFace Inference API** for embeddings (`bge-base-en-v1.5`, 768-dim) and reranking (`bge-reranker-base`)
- **Groq** (`groq-sdk`) for LLM generation with streaming
- **Tailwind CSS v4** (PostCSS plugin — config differs from v3)
- **Ollama** (`ollama` package) is a dependency but not yet integrated
