import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
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
  if (!dateStr) return 'No date set'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, event_date, status, captain_id, location, sports(name, icon, min_players, max_players)')
    .eq('id', id)
    .single()

  if (!group) notFound()

  const { data: membersData } = await supabase
    .from('group_members')
    .select('user_id, confirmed, joined_at, profiles(username)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  // RLS returns empty if user is neither member nor captain
  const isMember = (membersData ?? []).some((m) => m.user_id === user.id)
  const isCaptain = group.captain_id === user.id
  if (!isMember && !isCaptain) notFound()

  const sport = Array.isArray(group.sports) ? group.sports[0] : group.sports
  const sportName = (sport as { name: string } | null)?.name ?? 'Unknown'
  const sportIcon = (sport as { icon: string | null } | null)?.icon ?? null
  const maxPlayers = (sport as { max_players: number } | null)?.max_players ?? null

  type Member = { user_id: string; username: string; confirmed: boolean; isCaptain: boolean; isMe: boolean }

  const members: Member[] = (membersData ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      user_id: m.user_id as string,
      username: (profile as { username: string } | null)?.username ?? 'Unknown',
      confirmed: m.confirmed as boolean,
      isCaptain: m.user_id === group.captain_id,
      isMe: m.user_id === user.id,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Back */}
        <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-700">
          ← My Groups
        </Link>

        {/* Group header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {sportIcon && <span className="text-4xl">{sportIcon}</span>}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{sportName}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(group.event_date as string | null)}</p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[group.status as string] ?? 'bg-gray-100 text-gray-500'}`}
            >
              {STATUS_LABEL[group.status as string] ?? group.status}
            </span>
          </div>

          {(group.location as string | null) && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Location:</span> {group.location as string}
            </p>
          )}

          {isCaptain && (
            <p className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white text-center">
              You are the captain of this group
            </p>
          )}

          <Link
            href={`/groups/${id}/chat`}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            💬 Open Chat
          </Link>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Members
            </h2>
            {maxPlayers && (
              <span className="text-xs text-gray-400">
                {members.length} / {maxPlayers}
              </span>
            )}
          </div>

          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {m.username}
                      {m.isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.isCaptain && (
                    <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white">
                      Captain
                    </span>
                  )}
                  {!m.isCaptain && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.confirmed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {m.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
