import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export type GroupResult = {
  groupId: string
  eventId: string
  sport: string
  sportIcon: string | null
  title: string
  scheduledAt: string
  location: string | null
  memberCount: number
  city: string | null
}

export async function POST(request: NextRequest) {
  let sport: string, city: string | undefined
  try {
    const body = await request.json()
    sport = body.sport
    city = body.city
    if (!sport) return Response.json({ error: 'sport required' }, { status: 400 })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const db = adminClient()

  const { data: sports } = await db
    .from('sports')
    .select('id, name, icon')
    .ilike('name', `%${sport}%`)

  if (!sports || sports.length === 0) {
    return Response.json({ groups: [] })
  }

  const sportIds = sports.map((s: { id: string }) => s.id)

  let groupQuery = db
    .from('groups')
    .select('id, sport_id, city, captain_id')
    .eq('status', 'open')
    .in('sport_id', sportIds)

  if (city) {
    groupQuery = groupQuery.ilike('city', `%${city}%`)
  }

  const { data: groups } = await groupQuery

  if (!groups || groups.length === 0) {
    return Response.json({ groups: [] })
  }

  const groupIds = groups.map((g: { id: string }) => g.id)

  const [{ data: eventsData }, { data: memberRows }] = await Promise.all([
    db
      .from('events')
      .select('id, title, location, scheduled_at, group_id')
      .in('group_id', groupIds)
      .order('scheduled_at', { ascending: true }),
    db
      .from('group_members')
      .select('group_id, user_id')
      .in('group_id', groupIds),
  ])

  const sportMap = new Map(sports.map((s: { id: string; name: string; icon: string | null }) => [s.id, s]))
  const memberCountMap = new Map<string, number>()
  for (const m of memberRows ?? []) {
    memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1)
  }

  const groupMap = new Map(groups.map((g: { id: string; sport_id: string; city: string | null }) => [g.id, g]))

  const results: GroupResult[] = (eventsData ?? [])
    .map((e) => {
      const g = groupMap.get(e.group_id)
      if (!g) return null
      const sportData = sportMap.get(g.sport_id)
      return {
        groupId: g.id as string,
        eventId: e.id as string,
        sport: (sportData as { name: string } | undefined)?.name ?? sport,
        sportIcon: (sportData as { icon: string | null } | undefined)?.icon ?? null,
        title: e.title as string,
        scheduledAt: e.scheduled_at as string,
        location: (e.location ?? g.city) as string | null,
        memberCount: memberCountMap.get(g.id as string) ?? 0,
        city: g.city as string | null,
      }
    })
    .filter((r): r is GroupResult => r !== null)

  return Response.json({ groups: results })
}
