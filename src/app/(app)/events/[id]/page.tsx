import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import JoinLeaveButton from './JoinLeaveButton'
import VenuePoll from './VenuePoll'

type VenueSuggestion = { name: string; address: string; price: string }

const VENUE_SUGGESTIONS: Record<string, VenueSuggestion[]> = {
  Football: [
    { name: 'Teren Sintetic Arena', address: 'Str. Sportivilor 1', price: '80–120 RON/h' },
    { name: 'Complex Fotbal Nord', address: 'Bd. Unirii 12', price: '60–100 RON/h' },
    { name: 'Stadionul Municipal', address: 'Str. Gloriei 5', price: '100–150 RON/h' },
    { name: 'Teren Iarbă Naturală Sud', address: 'Str. Câmpului 3', price: '50–80 RON/h' },
  ],
  Basketball: [
    { name: 'Sala Baschet Centru', address: 'Str. Avram Iancu 2', price: '50–80 RON/h' },
    { name: 'Teren Baschet Parc', address: 'Parcul Central', price: 'Gratuit' },
    { name: 'Club Sportiv Baschet', address: 'Str. Sportului 10', price: '60–100 RON/h' },
  ],
  Tennis: [
    { name: 'Tennis Club Elite', address: 'Str. Tenis 3', price: '30–60 RON/h' },
    { name: 'Terenuri Tenis Sintetic', address: 'Bd. Victoriei 20', price: '40–70 RON/h' },
    { name: 'Club Sportiv Tenis', address: 'Str. Sportivilor 15', price: '25–50 RON/h' },
    { name: 'Baza Sportivă Est', address: 'Str. Estului 7', price: '35–55 RON/h' },
  ],
  Volleyball: [
    { name: 'Sala Volei Centru', address: 'Str. Unității 8', price: '40–70 RON/h' },
    { name: 'Teren Volei Plajă', address: 'Parcul Tineretului', price: '30–50 RON/h' },
    { name: 'Complex Sportiv Vest', address: 'Str. Vestului 3', price: '50–80 RON/h' },
  ],
  Running: [
    { name: 'Parcul Central', address: 'Centrul Orașului', price: 'Gratuit' },
    { name: 'Pistă Atletism', address: 'Stadionul Municipal', price: '10–20 RON/vizită' },
    { name: 'Traseu Riveran', address: 'Lunca Râului', price: 'Gratuit' },
    { name: 'Parc Dendrologic', address: 'Str. Pădurii 1', price: 'Gratuit' },
  ],
  Cycling: [
    { name: 'Pistă Ciclism Parc', address: 'Parcul Central', price: 'Gratuit' },
    { name: 'Traseu MTB Nord', address: 'Dealul Cetate', price: 'Gratuit' },
    { name: 'Velodrom Municipal', address: 'Str. Sportivilor 5', price: '15–30 RON/h' },
  ],
  Swimming: [
    { name: 'Bazin Olympic', address: 'Str. Înot 1', price: '20–35 RON/vizită' },
    { name: 'Aquapark City', address: 'Str. Apei 10', price: '30–50 RON/vizită' },
    { name: 'Strand Municipal', address: 'Parcul Strand', price: '15–25 RON/vizită' },
  ],
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient()

  const { data: event } = await db
    .from('events')
    .select('id, title, description, location, venue_name, scheduled_at, group_id')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const [{ data: group }, { data: membersData }, { data: voteOptions }, { data: votesData }] = await Promise.all([
    db
      .from('groups')
      .select('id, captain_id, status, sports(name, icon, min_players, max_players)')
      .eq('id', event.group_id)
      .single(),
    db
      .from('group_members')
      .select('user_id, confirmed, profiles(username)')
      .eq('group_id', event.group_id)
      .order('joined_at', { ascending: true }),
    db
      .from('vote_options')
      .select('id, option_text')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
    db
      .from('votes')
      .select('user_id, option_text')
      .eq('event_id', id),
  ])

  if (!group) notFound()

  const isMember = (membersData ?? []).some((m) => m.user_id === user.id)
  const isCaptain = group.captain_id === user.id

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
        <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700">
          ← Events
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {sportIcon && <span className="text-3xl">{sportIcon}</span>}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{sportName}</p>
                <h1 className="text-xl font-bold text-gray-900">{event.title as string}</h1>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[group.status as string] ?? 'bg-gray-100 text-gray-500'}`}
            >
              {STATUS_LABEL[group.status as string] ?? group.status}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-gray-600">
            <p>📅 {formatDateTime(event.scheduled_at as string)}</p>
            {(event.location as string | null) && <p>📍 {event.location as string}</p>}
            {(event.venue_name as string | null) && <p>🏟 {event.venue_name as string}</p>}
          </div>

          {(event.description as string | null) && (
            <p className="text-sm text-gray-600 leading-relaxed">{event.description as string}</p>
          )}

          {/* Captain actions */}
          {isCaptain && (
            <Link
              href={`/events/${id}/edit`}
              className="block text-center w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit Event
            </Link>
          )}
        </div>

        {/* Join / Leave */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <JoinLeaveButton
            groupId={event.group_id as string}
            eventId={id}
            isMember={isMember}
            isCaptain={isCaptain}
          />
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

          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No members yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {m.username}
                      {m.isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isCaptain && (
                      <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-white">
                        Organiser
                      </span>
                    )}
                    {!m.isCaptain && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {m.confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Venue Suggestions — captain only */}
        {isCaptain && VENUE_SUGGESTIONS[sportName] && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Venue Suggestions
            </h2>
            <ul className="space-y-3">
              {VENUE_SUGGESTIONS[sportName].map((v) => (
                <li key={v.name} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.address}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                    {v.price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Venue Poll */}
        {(isMember || isCaptain) && (
          <VenuePoll
            eventId={id}
            isCaptain={isCaptain}
            isMember={isMember}
            currentUserId={user.id}
            options={(voteOptions ?? []) as { id: string; option_text: string }[]}
            votes={(votesData ?? []) as { user_id: string; option_text: string }[]}
          />
        )}
      </div>
    </div>
  )
}
