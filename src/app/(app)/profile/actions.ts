'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export type ProfilePayload = {
  username?: string
  bio?: string
  skill_level: SkillLevel
  sport_selections: { sport_id: string; skill_level: SkillLevel }[]
}

type ActionResult = { error: string } | undefined

async function writeProfile(
  payload: ProfilePayload,
  redirectTo: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      ...(payload.username ? { username: payload.username } : {}),
      bio: payload.bio ?? null,
      skill_level: payload.skill_level,
    })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Replace all sport selections atomically
  const { error: deleteError } = await supabase
    .from('user_sports')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) return { error: deleteError.message }

  if (payload.sport_selections.length > 0) {
    const { error: insertError } = await supabase
      .from('user_sports')
      .insert(
        payload.sport_selections.map((s) => ({
          user_id: user.id,
          sport_id: s.sport_id,
          skill_level: s.skill_level,
        })),
      )
    if (insertError) return { error: insertError.message }
  }

  redirect(redirectTo)
}

export async function completeOnboarding(payload: ProfilePayload): Promise<ActionResult> {
  return writeProfile(payload, '/dashboard')
}

export async function updateProfile(payload: ProfilePayload): Promise<ActionResult> {
  return writeProfile(payload, '/profile')
}
