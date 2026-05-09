'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    .insert({ group_id: groupId, user_id: user.id, confirmed: true })

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
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
