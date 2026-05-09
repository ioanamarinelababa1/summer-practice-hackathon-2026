'use server'

import { createClient } from '@/lib/supabase/server'

export type SendMessageResult =
  | { error: string; message?: never }
  | { error?: never; message: { id: string; created_at: string; user_id: string } }

export async function sendMessage(
  groupId: string,
  content: string,
): Promise<SendMessageResult> {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message cannot be empty' }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, user_id: user.id, content: trimmed })
    .select('id, created_at, user_id')
    .single()

  if (error) return { error: error.message }
  return { message: { id: data.id, created_at: data.created_at, user_id: data.user_id } }
}
