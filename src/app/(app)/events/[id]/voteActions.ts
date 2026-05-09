'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function addVoteOption(
  eventId: string,
  optionText: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const db = adminClient()

  const { count } = await db
    .from('vote_options')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if ((count ?? 0) >= 3) return { error: 'Maximum 3 options allowed' }

  const { error } = await db
    .from('vote_options')
    .insert({ event_id: eventId, option_text: optionText.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
}

export async function castVote(
  eventId: string,
  optionText: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const db = adminClient()

  const { error } = await db
    .from('votes')
    .upsert(
      { event_id: eventId, user_id: user.id, option_text: optionText },
      { onConflict: 'event_id,user_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
}
