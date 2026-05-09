import type { NextRequest } from 'next/server'

const SYSTEM_PROMPT = `You are a friendly sports matching assistant for ShowUp2Move. \
Ask the user exactly 3 questions one at a time:
1) What sport do you want to play?
2) What city are you in?
3) What is your availability today (time interval)?
Keep each question short and friendly. Do not ask multiple questions at once. \
After you have received clear answers to all 3 questions, respond with exactly this format and nothing else:
MATCH_READY|sport:<sport>|city:<city>|time:<time interval>`

type GroqMessage = { role: string; content: string }

export async function POST(request: NextRequest) {
  let messages: GroqMessage[]
  try {
    const body = await request.json()
    if (!Array.isArray(body.messages)) {
      return Response.json({ error: 'messages array required' }, { status: 400 })
    }
    messages = body.messages
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 256,
      temperature: 0.6,
    }),
  })

  if (!groqRes.ok) {
    const text = await groqRes.text()
    console.error('[ai-chat] Groq error:', text)
    return Response.json({ error: 'Groq API error' }, { status: 502 })
  }

  const data = await groqRes.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''
  return Response.json({ content })
}
