import { search } from '@/lib/rag'
import ollama from 'ollama'

export async function POST(request: Request) {
  try {
    const { question } = await request.json()

    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Missing question field' }, { status: 400 })
    }

    const chunks = await search(question, 5)
    console.log('chunks: ', chunks);

    const context = chunks
      .map((c, i) => `[Source ${i + 1}] (${c.filename})\n${c.content}`)
      .join('\n\n')
    console.log('context: ', context);

    const systemPrompt = `You are a Supabase documentation assistant. Answer the user's question using only the provided source excerpts below. At the end of your answer, cite which source numbers (e.g. [1], [2]) you relied on. If the sources do not contain enough information to answer, say so.

Sources:
${context}`

    const response = await ollama.chat({
      model: 'llama3.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    })

    const sources = chunks.map((c) => ({
      filename: c.filename,
      source: c.source,
      similarity: c.similarity,
    }))

    return Response.json({
      answer: response.message.content,
      sources,
    })
  } catch (err) {
    console.error('[/api/chat]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
