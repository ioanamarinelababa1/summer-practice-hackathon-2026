import type { NextRequest } from 'next/server'

const SPORT_KEYWORDS: Record<string, string[]> = {
  Football:   ['football', 'soccer', 'fotbal'],
  Basketball: ['basketball', 'baschet'],
  Tennis:     ['tennis', 'tenis'],
  Volleyball: ['volleyball', 'volei'],
  Running:    ['running', 'jogging', 'run', 'alergare', 'alerg'],
  Cycling:    ['cycling', 'bike', 'biking', 'ciclism'],
  Swimming:   ['swimming', 'swim', 'inot'],
}

function detectSports(bio: string): string[] {
  const lower = bio.toLowerCase()
  return Object.entries(SPORT_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([sport]) => sport)
}

export async function POST(request: NextRequest) {
  let bio: string
  try {
    const body = await request.json()
    if (typeof body?.bio !== 'string' || !body.bio.trim()) {
      return Response.json({ error: 'bio is required' }, { status: 400 })
    }
    bio = body.bio.trim()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  return Response.json({ sports: detectSports(bio) })
}
