import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction',
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

export async function search(query: string, topK = 5) {
  const queryEmbedding = await embed(query)

  const result = await pool.query(
    `SELECT content, source, filename,
     ROUND((1 - (embedding <=> $1))::numeric, 4) AS similarity
     FROM documents
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [JSON.stringify(queryEmbedding), topK]
  )

  return result.rows
}