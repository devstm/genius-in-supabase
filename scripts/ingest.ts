import { Pool } from 'pg'
import axios from 'axios'
import { embed } from '../lib/rag'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function chunkText(text: string): string[] {
  const sections = text.split(/(?=^#{1,3} )/m)
  const chunks: string[] = []
  for (const section of sections) {
    if (section.trim().length < 50) continue

    if (section.length > 1500) {
      const paragraphs = section.split(/\n\n/)
      for (const paragraph of paragraphs) {
        if (paragraph.trim().length < 50) continue
        chunks.push(paragraph.trim())
      }
    } else {
      chunks.push(section.trim())
    }
  }
  return chunks
}

async function fetchFiles(path: string): Promise<any[]> {
  const url = `https://api.github.com/repos/supabase/supabase/contents/${path}`
  const response = await axios.get(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    }
  })

  let allFiles: any[] = []

  for (const item of response.data) {
    if (item.type === 'file' && (item.name.endsWith('.mdx') || item.name.endsWith('.md'))) {
      allFiles.push(item)
    } else if (item.type === 'dir') {
      const subFiles = await fetchFiles(item.path)
      allFiles = allFiles.concat(subFiles)
    }
  }

  return allFiles
}

async function ingestFile(filename: string, content: string, source: string) {
  const chunks = chunkText(content)
  let stored = 0

  for (const chunk of chunks) {
    if (chunk.trim().length < 50) continue
    const embedding = await embed(chunk)
    await pool.query(
      `INSERT INTO documents (content, embedding, source, filename) VALUES ($1, $2, $3, $4)`,
      [chunk, JSON.stringify(embedding), source, filename]
    )
    stored++
  }

  console.log(`Ingested ${stored} chunks from ${filename}`)
}

async function main() {
  console.log('Fetching Supabase docs from GitHub...')

  const files = await fetchFiles('apps/docs/content')
  console.log(`Found ${files.length} files. Starting ingestion...`)

  for (const file of files) {
    try {
      const response = await axios.get(file.download_url)
      await ingestFile(file.name, response.data, file.html_url)
    } catch (err) {
      console.error(`Failed to ingest ${file.name}:`, err)
    }
  }

  console.log('All done!')
  await pool.end()
}

main().catch(console.error)