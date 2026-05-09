'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setAvailability(
  date: string,
  isAvailable: boolean,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('availability')
    .upsert(
      { user_id: user.id, date, is_available: isAvailable },
      { onConflict: 'user_id,date' },
    )

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
}
