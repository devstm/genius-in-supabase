import { rerank, search } from '../../../lib/rag'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, })

export async function POST(request: Request) {
  try {
    const { question } = await request.json()

    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Missing question field' }, { status: 400 })
    }

    const rawChunks = await search(question, 10)
    const chunks = await rerank(question, rawChunks)
    console.log('chunks: ', chunks);

    const context = chunks
      .map((c, i) => `[Source ${i + 1}] (${c.filename})\n${c.content}`)
      .join('\n\n')
    // console.log('context: ', context);

    const systemPrompt = `You are a Supabase documentation assistant. Answer the user's question using only the provided source excerpts below. At the end of your answer, cite which source numbers (e.g. [1], [2]) you relied on. If the sources do not contain enough information to answer, say so.

Sources:
${context}`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    })

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          controller.enqueue(new TextEncoder().encode(text))
        }
        const sources = chunks.map((c) => ({
          filename: c.filename,
          source: c.source,
          rerank_score: c.rerank_score,
        }))
        controller.enqueue(new TextEncoder().encode(`\n__SOURCES__${JSON.stringify(sources)}`))

        controller.close()
      }
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (err) {
    console.error('[/api/chat]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
