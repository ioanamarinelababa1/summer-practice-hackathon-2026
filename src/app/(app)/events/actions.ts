'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateEventPayload = {
  sport_id: string
  title: string
  description?: string
  location?: string
  venue_name?: string
  scheduled_at: string
}

export type UpdateEventPayload = {
  title: string
  description?: string
  location?: string
  venue_name?: string
  scheduled_at: string
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createEvent(
  payload: CreateEventPayload,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      sport_id: payload.sport_id,
      captain_id: user.id,
      status: 'open',
      event_date: payload.scheduled_at.split('T')[0],
      location: payload.location || null,
    })
    .select('id')
    .single()

  if (groupError || !group) return { error: groupError?.message ?? 'Failed to create group' }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      group_id: group.id,
      title: payload.title,
      description: payload.description || null,
      location: payload.location || null,
      venue_name: payload.venue_name || null,
      scheduled_at: payload.scheduled_at,
    })
    .select('id')
    .single()

  if (eventError || !event) return { error: eventError?.message ?? 'Failed to create event' }

  redirect(`/events/${event.id}`)
}

export async function joinGroup(
  groupId: string,
  eventId: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_members')
    .upsert({ group_id: groupId, user_id: user.id, confirmed: true }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })

  if (error) return { error: error.message }

  // Notify captain (fire-and-forget — don't fail the join if this errors)
  void notifyCaptainOnJoin(user.id, groupId, eventId)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
}

async function notifyCaptainOnJoin(joinerId: string, groupId: string, eventId: string) {
  try {
    const db = adminClient()
    const [{ data: group }, { data: event }, { data: profile }] = await Promise.all([
      db.from('groups').select('captain_id').eq('id', groupId).single(),
      db.from('events').select('title').eq('id', eventId).single(),
      db.from('profiles').select('username').eq('id', joinerId).single(),
    ])
    if (!group || !event || !profile) return
    if (group.captain_id === joinerId) return // captain joining their own event

    await db.from('notifications').insert({
      user_id: group.captain_id,
      type: 'event_join',
      message: `${profile.username} joined your event "${event.title}"`,
    })
  } catch {
    // non-critical
  }
}

export async function leaveGroup(
  groupId: string,
  eventId: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
}

export async function updateEvent(
  eventId: string,
  groupId: string,
  payload: UpdateEventPayload,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error: eventError } = await supabase
    .from('events')
    .update({
      title: payload.title,
      description: payload.description || null,
      location: payload.location || null,
      venue_name: payload.venue_name || null,
      scheduled_at: payload.scheduled_at,
    })
    .eq('id', eventId)

  if (eventError) return { error: eventError.message }

  // Keep group fields in sync
  await supabase
    .from('groups')
    .update({
      event_date: payload.scheduled_at.split('T')[0],
      location: payload.location || null,
    })
    .eq('id', groupId)

  redirect(`/events/${eventId}`)
}
