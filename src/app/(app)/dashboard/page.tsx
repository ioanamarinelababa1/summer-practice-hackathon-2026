import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TodayPrompt from './TodayPrompt'
import WeekCalendar, { type DaySlot } from './WeekCalendar'

// ── Date helpers ────────────────────────────────────────────────────────────

function isoDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function formatLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTodayHeading(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ── Sport count types ────────────────────────────────────────────────────────

type SportCount = {
  id: string
  name: string
  icon: string | null
  count: number
  userIds: string[]
}

// ── Avatar cluster ───────────────────────────────────────────────────────────

function AvatarCluster({
  userIds,
  usernameMap,
  total,
}: {
  userIds: string[]
  usernameMap: Map<string, string>
  total: number
}) {
  const shown = userIds.slice(0, 3)
  const overflow = total - shown.length

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {shown.map((uid) => {
          const initial = (usernameMap.get(uid) ?? '?').charAt(0).toUpperCase()
          return (
            <div
              key={uid}
              title={usernameMap.get(uid)}
              className="h-6 w-6 rounded-full bg-green-500 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            >
              {initial}
            </div>
          )
        })}
        {overflow > 0 && (
          <div className="h-6 w-6 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[9px] font-medium text-gray-500 shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      <span className="animate-count-pulse text-sm font-bold text-green-600 tabular-nums">
        {total}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = isoDate(0)

  const weekDates = Array.from({ length: 7 }, (_, i) => isoDate(i + 1))

  const [
    { data: todayRow },
    { data: weekRows },
    { data: availableToday },
  ] = await Promise.all([
    supabase
      .from('availability')
      .select('is_available')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('availability')
      .select('date, is_available')
      .eq('user_id', user.id)
      .in('date', weekDates),
    supabase
      .from('availability')
      .select('user_id')
      .eq('date', today)
      .eq('is_available', true)
      .neq('user_id', user.id),
  ])

  const availMap = new Map((weekRows ?? []).map((r) => [r.date, r.is_available as boolean]))
  const weekSlots: DaySlot[] = weekDates.map((date, i) => ({
    date,
    label: formatLabel(date, i),
    isAvailable: availMap.has(date) ? availMap.get(date)! : null,
  }))

  const availableUserIds = (availableToday ?? []).map((r) => r.user_id)
  let sportCounts: SportCount[] = []
  const usernameMap = new Map<string, string>()

  if (availableUserIds.length > 0) {
    const [{ data: userSportsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from('user_sports')
        .select('user_id, sport_id, sports(id, name, icon)')
        .in('user_id', availableUserIds),
      supabase
        .from('profiles')
        .select('id, username')
        .in('id', availableUserIds),
    ])

    for (const p of profilesData ?? []) {
      usernameMap.set(p.id as string, p.username as string)
    }

    const countMap = new Map<string, SportCount>()
    for (const row of userSportsData ?? []) {
      const sport = (Array.isArray(row.sports) ? row.sports[0] : row.sports) as {
        id: string
        name: string
        icon: string | null
      } | null
      if (!sport) continue
      const entry = countMap.get(sport.id)
      if (entry) {
        entry.count++
        entry.userIds.push(row.user_id)
      } else {
        countMap.set(sport.id, {
          id: sport.id,
          name: sport.name,
          icon: sport.icon,
          count: 1,
          userIds: [row.user_id],
        })
      }
    }
    sportCounts = Array.from(countMap.values()).sort((a, b) => b.count - a.count)
  }

  const todayIsAvailable: boolean | null =
    todayRow == null ? null : (todayRow.is_available as boolean)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ShowUp Today</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatTodayHeading()}</p>
        </div>

        {/* Today YES/NO prompt */}
        <TodayPrompt today={today} initialIsAvailable={todayIsAvailable} />

        {/* Others available today per sport */}
        {sportCounts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Others available today
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {sportCounts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {s.icon && <span className="text-xl shrink-0">{s.icon}</span>}
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  </div>
                  <AvatarCluster
                    userIds={s.userIds}
                    usernameMap={usernameMap}
                    total={s.count}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {sportCounts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-sm text-gray-500">No one else has marked themselves available yet.</p>
          </div>
        )}

        {/* Weekly availability picker */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Your week ahead
          </h2>
          <WeekCalendar days={weekSlots} />
        </div>

      </div>
    </div>
  )
}
