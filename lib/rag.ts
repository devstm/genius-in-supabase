import { pipeline } from '@xenova/transformers'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let embedder: any = null

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return embedder
}

export async function embed(text: string): Promise<number[]> {
  const model = await getEmbedder()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data) as number[]
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