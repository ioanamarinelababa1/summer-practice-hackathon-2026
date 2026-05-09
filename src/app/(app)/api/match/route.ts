import type { NextRequest } from 'next/server'
import { runDailyMatching } from '@/lib/matching'

export async function POST(request: NextRequest) {
  // Optional date override for back-fill / testing
  let date: string | undefined
  try {
    const body = await request.json()
    if (typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      date = body.date
    }
  } catch {
    // no body — fine
  }

  const result = await runDailyMatching(date)

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  return Response.json(result)
}
