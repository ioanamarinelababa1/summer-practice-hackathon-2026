import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  full: 'Full',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  full: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default async function GroupsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('confirmed, groups(id, event_date, status, captain_id, sports(name, icon))')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  console.log('[groups page] user.id:', user.id)
  console.log('[groups page] memberships error:', membershipsError)
  console.log('[groups page] memberships raw:', JSON.stringify(memberships, null, 2))

  type GroupRow = {
    id: string
    event_date: string | null
    status: string
    captain_id: string
    sport_name: string
    sport_icon: string | null
    is_captain: boolean
    confirmed: boolean
  }

  const groups: GroupRow[] = (memberships ?? [])
    .map((m) => {
      const g = Array.isArray(m.groups) ? m.groups[0] : m.groups
      if (!g) return null
      const s = Array.isArray(g.sports) ? g.sports[0] : g.sports
      return {
        id: g.id as string,
        event_date: g.event_date as string | null,
        status: g.status as string,
        captain_id: g.captain_id as string,
        sport_name: (s as { name: string } | null)?.name ?? 'Unknown',
        sport_icon: (s as { icon: string | null } | null)?.icon ?? null,
        is_captain: g.captain_id === user.id,
        confirmed: m.confirmed as boolean,
      }
    })
    .filter((g): g is GroupRow => g !== null)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-3">
            <p className="text-gray-500 text-sm">You haven&apos;t been matched to any groups yet.</p>
            <p className="text-gray-400 text-xs">
              Mark yourself available on the dashboard — groups form automatically each day.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-2 text-sm font-medium text-gray-900 underline"
            >
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {g.sport_icon && (
                      <span className="text-2xl shrink-0">{g.sport_icon}</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {g.sport_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(g.event_date)}
                        {g.is_captain && ' · Captain'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[g.status] ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {STATUS_LABEL[g.status] ?? g.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
