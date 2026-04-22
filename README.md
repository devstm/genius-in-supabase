# Genius in Supabase

An AI-powered documentation assistant that lets you ask natural language questions about Supabase and get accurate, cited answers.

**Live demo:** https://genius-in-supabase-4zxr6fuv9-salehs-projects-21420035.vercel.app

<img width="1920" height="910" alt="Screenshot_20260421_223714" src="https://github.com/user-attachments/assets/ebe9ac3f-b31a-4f29-bd95-bcedef74c0cc" />
<img width="1919" height="901" alt="Screenshot_20260421_223843" src="https://github.com/user-attachments/assets/ff09fea1-f017-4cc9-8ebe-ceb35e828cb5" />

## What it does

Instead of searching through hundreds of documentation pages manually, you ask a question in plain English and get a direct answer with links to the exact source files it used.

## How it works

```
Supabase MDX docs (10,454 chunks)
         |
Embedded with all-MiniLM-L6-v2
         |
Stored in pgvector (PostgreSQL)
         |
User asks a question
         |
Question embedded -> semantic search
         |
Top 5 relevant chunks retrieved
         |
Chunks sent to llama3.2 via Ollama
         |
Answer with cited sources returned
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Embeddings | `all-MiniLM-L6-v2` via `@xenova/transformers` (local, no API key) |
| Vector search | pgvector + HNSW index on PostgreSQL |
| LLM | llama3.2 via Ollama (local, no API key) |
| Database | PostgreSQL 16 via Docker |

## Key technical decisions

**Why pgvector instead of Chroma or Pinecone?**
pgvector keeps the vector store inside PostgreSQL, so there is no separate service to run or maintain. The HNSW index makes search fast at scale without needing a managed vector database.

**Why local models?**
Both the embedding model and the LLM run entirely on your machine. No API costs, no data sent to third parties, and it works offline.

**Why semantic search over keyword search?**
A user asking "how do I restrict table access?" and documentation saying "Row Level Security policies" share no common words, but semantic search finds the match because it understands meaning.

## Getting started

### Prerequisites
- Node.js 18+
- Docker
- Ollama

### 1. Clone the repo

```bash
git clone https://github.com/your-username/genius-in-supabase
cd genius-in-supabase
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the database

```bash
docker run -d \
  --name pgvector-db \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ragchat
GITHUB_TOKEN=your_github_token
```

### 5. Create the database schema

```bash
docker exec -it pgvector-db psql -U postgres -c "CREATE DATABASE ragchat;"
docker exec -it pgvector-db psql -U postgres -d ragchat -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker exec -it pgvector-db psql -U postgres -d ragchat -c "
  CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(384),
    source TEXT,
    filename TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
"
```

### 6. Pull the LLM

```bash
ollama pull llama3.2
```

### 7. Ingest the Supabase docs

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/ragchat \
GITHUB_TOKEN=your_token \
npx ts-node scripts/ingest.ts
```

This fetches and embeds 10,000+ chunks from the official Supabase documentation.

### 8. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## What I learned building this

- How RAG pipelines work end to end: chunking, embedding, retrieval, generation
- How pgvector stores and searches high-dimensional vectors using HNSW indexing
- The practical difference between semantic search and keyword search
- How to run LLMs locally using Ollama with no API costs
- How to build a Next.js API route that connects to a local LLM

## Author

**Saleh Marouf** - Full-stack software engineer  
[LinkedIn](https://www.linkedin.com/in/saleh-marouf/) · [GitHub](https://github.com/devstm)
