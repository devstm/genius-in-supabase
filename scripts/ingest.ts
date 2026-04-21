import axios from 'axios'
import { embed, pool } from '../lib/rag'

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = start + chunkSize
    chunks.push(text.slice(start, end))
    start = end - overlap
  }
  return chunks
}

type GitHubFile = {
  type: 'file' | 'dir'
  name: string
  path: string
  download_url: string
  html_url: string
}

async function fetchFiles(path: string): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/supabase/supabase/contents/${path}`
  const response = await axios.get<GitHubFile[]>(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    }
  })

  let allFiles: GitHubFile[] = []

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