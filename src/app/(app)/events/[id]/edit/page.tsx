import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import EditEventForm from './EditEventForm'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function EditEventPage({
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

  const { data: group } = await db
    .from('groups')
    .select('id, captain_id, sports(name, icon)')
    .eq('id', event.group_id)
    .single()

  if (!group) notFound()
  if (group.captain_id !== user.id) redirect(`/events/${id}`)

  const sport = Array.isArray(group.sports) ? group.sports[0] : group.sports
  const sportName = (sport as { name: string } | null)?.name ?? 'Unknown'
  const sportIcon = (sport as { icon: string | null } | null)?.icon ?? null

  // Convert stored timestamptz to datetime-local format (slice to YYYY-MM-DDTHH:MM)
  const scheduledAtLocal = (event.scheduled_at as string).slice(0, 16)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <Link href={`/events/${id}`} className="group inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-green-600 transition-all duration-200">
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Cancel
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <EditEventForm
            eventId={id}
            groupId={event.group_id as string}
            sportName={sportName}
            sportIcon={sportIcon}
            initial={{
              title: event.title as string,
              description: (event.description as string | null) ?? '',
              location: (event.location as string | null) ?? '',
              venue_name: (event.venue_name as string | null) ?? '',
              scheduled_at: scheduledAtLocal,
            }}
          />
        </div>
      </div>
    </div>
  )
}
