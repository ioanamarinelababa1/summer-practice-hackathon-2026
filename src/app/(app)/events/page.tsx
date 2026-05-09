import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import JoinButton from './JoinButton'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function EventsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient()

  const { data: openGroups } = await db
    .from('groups')
    .select('id, captain_id, sports(name, icon, max_players)')
    .eq('status', 'open')

  const openGroupIds = (openGroups ?? []).map((g) => g.id as string)

  type EventItem = {
    id: string
    title: string
    description: string | null
    location: string | null
    scheduled_at: string
    group_id: string
    sport_name: string
    sport_icon: string | null
    max_players: number
    member_count: number
    is_member: boolean
    city_match: boolean
    captain_city: string | null
  }

  const captainIds = [...new Set((openGroups ?? []).map((g) => g.captain_id as string))]
  console.log('[events] captainIds:', captainIds)

  const { data: userProfile } = await userClient
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .single()

  const { data: captainProfiles, error: captainProfilesError } = captainIds.length > 0
    ? await db.from('profiles').select('id, city').in('id', captainIds)
    : { data: [], error: null }

  console.log('[events] captainProfiles raw:', captainProfiles, '| error:', captainProfilesError)

  const userCity: string | null = (userProfile as { city: string | null } | null)?.city ?? null
  const captainCityMap = new Map(
    ((captainProfiles ?? []) as { id: string; city: string | null }[]).map((p) => [p.id, p.city]),
  )

  console.log('[events] userCity:', userCity)
  console.log('[events] captainCityMap:', Object.fromEntries(captainCityMap))

  let events: EventItem[] = []

  if (openGroupIds.length > 0) {
    const [{ data: eventsData }, { data: memberRows }] = await Promise.all([
      db
        .from('events')
        .select('id, title, description, location, scheduled_at, group_id')
        .in('group_id', openGroupIds)
        .order('scheduled_at', { ascending: true }),
      db
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', openGroupIds),
    ])

    const groupMap = new Map((openGroups ?? []).map((g) => [g.id as string, g]))
    const memberCountMap = new Map<string, number>()
    const userGroupSet = new Set<string>()

    for (const m of memberRows ?? []) {
      memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1)
      if (m.user_id === user.id) userGroupSet.add(m.group_id)
    }

    events = (eventsData ?? [])
      .map((e) => {
        const g = groupMap.get(e.group_id as string)
        if (!g) return null
        const sport = Array.isArray(g.sports) ? g.sports[0] : g.sports
        const captainCity = captainCityMap.get(g.captain_id as string) ?? null
        return {
          id: e.id as string,
          title: e.title as string,
          description: e.description as string | null,
          location: e.location as string | null,
          scheduled_at: e.scheduled_at as string,
          group_id: e.group_id as string,
          sport_name: (sport as { name: string } | null)?.name ?? 'Unknown',
          sport_icon: (sport as { icon: string | null } | null)?.icon ?? null,
          max_players: (sport as { max_players: number } | null)?.max_players ?? 0,
          member_count: memberCountMap.get(e.group_id as string) ?? 0,
          is_member: userGroupSet.has(e.group_id as string),
          city_match: Boolean(userCity && captainCity && userCity === captainCity),
          captain_city: captainCity,
        }
      })
      .map((e) => {
        if (e) console.log(`[events] event "${e.title}": captain_city=${e.captain_city}, city_match=${e.city_match}`)
        return e
      })
      .filter((e): e is EventItem => e !== null)
      .sort((a, b) => {
        if (a.city_match && !b.city_match) return -1
        if (!a.city_match && b.city_match) return 1
        return 0
      })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <Link
            href="/events/create"
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
          >
            + Create
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-3">
            <p className="text-sm text-gray-500">No upcoming events yet.</p>
            <Link href="/events/create" className="text-sm font-medium text-green-600 hover:text-green-700 underline">
              Create the first one →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((e) => (
              <li key={e.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-green-100">
                {/* Sport + title row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {e.sport_icon && <span className="text-sm">{e.sport_icon}</span>}
                      <span className="text-xs text-gray-400">{e.sport_name}</span>
                      {e.captain_city && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          {e.captain_city}
                        </span>
                      )}
                      {e.city_match && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          City Match
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-gray-900">{e.title}</h2>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 mt-1">
                    {e.member_count}/{e.max_players}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>📅 {formatDateTime(e.scheduled_at)}</span>
                  {e.location && <span>📍 {e.location}</span>}
                </div>

                {e.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{e.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <Link href={`/events/${e.id}`} className="text-sm text-green-600 hover:text-green-700 font-medium">
                    View details →
                  </Link>

                  {e.is_member ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Joined
                    </span>
                  ) : (
                    <JoinButton groupId={e.group_id} eventId={e.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
