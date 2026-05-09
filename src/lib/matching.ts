import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MatchingResult = {
  date: string
  groupsCreated: number
  totalMembers: number
  skippedAvailable: number
  sport_breakdown: { sport: string; groups: number; members: number }[]
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── Core matching logic ───────────────────────────────────────────────────────

export async function runDailyMatching(date?: string): Promise<MatchingResult> {
  const today = date ?? new Date().toISOString().split('T')[0]

  let db: ReturnType<typeof adminClient>
  try {
    db = adminClient()
  } catch (e) {
    return { date: today, groupsCreated: 0, totalMembers: 0, skippedAvailable: 0, sport_breakdown: [], error: String(e) }
  }

  // 1. Users available today
  const { data: availRows, error: availError } = await db
    .from('availability')
    .select('user_id')
    .eq('date', today)
    .eq('is_available', true)

  if (availError) {
    return { date: today, groupsCreated: 0, totalMembers: 0, skippedAvailable: 0, sport_breakdown: [], error: availError.message }
  }

  const allAvailable = (availRows ?? []).map((r) => r.user_id as string)
  console.log('[matching] Available users:', allAvailable.length)
  if (allAvailable.length === 0) {
    return { date: today, groupsCreated: 0, totalMembers: 0, skippedAvailable: 0, sport_breakdown: [] }
  }

  // 2. Users already in a group today (skip them)
  const { data: existingGroups } = await db
    .from('groups')
    .select('id')
    .eq('event_date', today)

  const existingGroupIds = (existingGroups ?? []).map((g) => g.id as string)
  const alreadyMatched = new Set<string>()

  if (existingGroupIds.length > 0) {
    const { data: existingMembers } = await db
      .from('group_members')
      .select('user_id')
      .in('group_id', existingGroupIds)
    ;(existingMembers ?? []).forEach((m) => alreadyMatched.add(m.user_id as string))
  }

  const unmatched = allAvailable.filter((id) => !alreadyMatched.has(id))
  console.log('[matching] Unmatched users:', unmatched.length)
  if (unmatched.length === 0) {
    return { date: today, groupsCreated: 0, totalMembers: 0, skippedAvailable: 0, sport_breakdown: [] }
  }

  // 3. Sport preferences for unmatched users
  const { data: userSportsRows } = await db
    .from('user_sports')
    .select('user_id, sport_id')
    .in('user_id', unmatched)
  console.log('[matching] user_sports rows:', userSportsRows?.length ?? 0, userSportsRows)

  // 3b. City data for proximity-based grouping
  const { data: profileRows } = await db
    .from('profiles')
    .select('id, city')
    .in('id', unmatched)

  const cityMap = new Map<string, string>()
  for (const p of profileRows ?? []) {
    if (p.city) cityMap.set(p.id as string, p.city as string)
  }
  console.log('[matching] Users with city:', cityMap.size)

  // 4. Sports catalogue (min/max player counts)
  const { data: sportsRows, error: sportsError } = await db
    .from('sports')
    .select('id, name, min_players, max_players')

  if (sportsError) console.log('[matching] sports query error:', sportsError)

  type SportMeta = { id: string; name: string; min_players: number; max_players: number }
  const sportsMap = new Map<string, SportMeta>(
    (sportsRows ?? []).map((s) => [s.id as string, s as SportMeta]),
  )
  console.log('[matching] sportsMap:', Object.fromEntries(
    Array.from(sportsMap.entries()).map(([id, s]) => [s.name, { id, min_players: s.min_players, max_players: s.max_players }])
  ))

  // 5. Index: sport → list of available users who play it
  const sportToUsers = new Map<string, string[]>()
  for (const row of userSportsRows ?? []) {
    const arr = sportToUsers.get(row.sport_id as string) ?? []
    arr.push(row.user_id as string)
    sportToUsers.set(row.sport_id as string, arr)
  }

  // 6. Form groups — track who has been matched this run to prevent double-booking
  const matchedThisRun = new Set<string>()
  let groupsCreated = 0
  let totalMembers = 0
  const breakdown: MatchingResult['sport_breakdown'] = []

  console.log('[matching] sportToUsers map:', Object.fromEntries(
    Array.from(sportToUsers.entries()).map(([sid, uids]) => {
      const name = sportsMap.get(sid)?.name ?? sid
      return [name, uids]
    })
  ))

  for (const [sportId, candidates] of sportToUsers) {
    const sport = sportsMap.get(sportId)
    if (!sport) continue

    console.log('[matching] Processing sport:', sport.name, '| sportId:', sportId, '| candidates:', candidates)

    const eligible = candidates.filter((id) => !matchedThisRun.has(id))

    // Cluster by city; users with no city go into a fallback bucket
    const cityBuckets = new Map<string, string[]>()
    const noCityBucket: string[] = []
    for (const id of eligible) {
      const city = cityMap.get(id)
      if (city) {
        const bucket = cityBuckets.get(city) ?? []
        bucket.push(id)
        cityBuckets.set(city, bucket)
      } else {
        noCityBucket.push(id)
      }
    }
    const clusters = [...cityBuckets.values(), ...(noCityBucket.length > 0 ? [noCityBucket] : [])]
    console.log('[matching] Sport:', sport.name, '| city clusters:', clusters.map((c) => c.length))

    let sportGroups = 0
    let sportMembers = 0

    for (const cluster of clusters) {
      // Re-filter in case a user was matched in a previous cluster this sport iteration
      const pool = shuffle(cluster.filter((id) => !matchedThisRun.has(id)))
      if (pool.length < sport.min_players) continue

      let cursor = 0
      while (cursor < pool.length) {
        const size = Math.min(sport.max_players, pool.length - cursor)
        console.log('[matching] While loop:', sport.name, '| cursor:', cursor, '| size:', size, '| min_players:', sport.min_players)
        if (size < sport.min_players) {
          console.log('[matching] Breaking — size < min_players:', size, '<', sport.min_players)
          break
        }

        const groupUsers = pool.slice(cursor, cursor + size)
        cursor += size

        // Random captain
        const captainId = groupUsers[Math.floor(Math.random() * groupUsers.length)]
        console.log('[matching] Attempting group insert:', { sport: sport.name, captainId, groupUsers, event_date: today })

        // Insert group — trigger auto-adds captain as confirmed member
        const { data: group, error: groupErr } = await db
          .from('groups')
          .insert({ sport_id: sportId, captain_id: captainId, event_date: today })
          .select('id')
          .single()

        console.log('[matching] Group insert result:', { group, error: groupErr })
        if (groupErr || !group) continue

        // Insert remaining members
        const nonCaptains = groupUsers.filter((id) => id !== captainId)
        if (nonCaptains.length > 0) {
          await db
            .from('group_members')
            .insert(nonCaptains.map((uid) => ({ group_id: group.id, user_id: uid, confirmed: true })))
        }

        groupUsers.forEach((id) => matchedThisRun.add(id))
        sportGroups++
        sportMembers += groupUsers.length
      }
    }

    if (sportGroups > 0) {
      breakdown.push({ sport: sport.name, groups: sportGroups, members: sportMembers })
      groupsCreated += sportGroups
      totalMembers += sportMembers
    }
  }

  const skippedAvailable = unmatched.length - matchedThisRun.size

  return { date: today, groupsCreated, totalMembers, skippedAvailable, sport_breakdown: breakdown }
}
