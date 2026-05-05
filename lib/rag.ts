import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5/pipeline/feature-extraction',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  )

  if (!res.ok) {
    throw new Error(`HuggingFace embedding failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as number[] | number[][]
  return Array.isArray(data[0]) ? (data as number[][])[0] : (data as number[])
}

export async function rerank(query: string, chunks: any[]): Promise<any[]> {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/BAAI/bge-reranker-base',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: chunks.map((c) => ({
          text: query,
          text_pair: c.content.slice(0,512),
        })),
      }),
    }
  )

  const scores = await res.json() as any
  console.log('scores: ', scores);

  return chunks
    .map((chunk, i) => ({ ...chunk, rerank_score: scores[0][i]?.score }))
    .sort((a, b) => b.rerank_score - a.rerank_score)
    .slice(0, 3)
}

export async function search(query: string, topK = 5) {
  const queryEmbedding = await embed(query)

  const result = await pool.query(
    `SELECT content, source, filename,
    (1 - (embedding <=> $1)) AS vector_score, ts_rank(fts, plainto_tsquery('english', $3)) AS bm25_score,
    ((1 - (embedding <=> $1)) * 0.7 + ts_rank(fts, plainto_tsquery('english', $3)) * 0.3) AS combined_score
    FROM documents
    WHERE (1 - (embedding <=> $1)) > 0.3
    OR fts @@ plainto_tsquery('english', $3)
    ORDER BY combined_score DESC
    LIMIT $2`,
    [JSON.stringify(queryEmbedding), topK, query]
  )

  return result.rows
}