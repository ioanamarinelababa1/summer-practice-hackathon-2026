import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditProfileForm, { type SportOption } from './EditProfileForm'

export default async function EditProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sports }, { data: profile }, { data: userSports }] = await Promise.all([
    supabase.from('sports').select('id, name, icon').order('name'),
    supabase.from('profiles').select('bio, skill_level').eq('id', user.id).single(),
    supabase.from('user_sports').select('sport_id, skill_level').eq('user_id', user.id),
  ])

  if (!profile) redirect('/onboarding')

  const userSportMap = new Map(
    (userSports ?? []).map((us) => [us.sport_id, us.skill_level]),
  )

  const sportOptions: SportOption[] = (sports ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    current_skill_level: userSportMap.get(s.id) as SportOption['current_skill_level'],
  }))

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Edit profile</h1>
        <p className="text-sm text-gray-500 mb-8">Update your bio and sport preferences.</p>

        <EditProfileForm
          sports={sportOptions}
          currentSkillLevel={profile.skill_level as SportOption['current_skill_level']}
          currentBio={profile.bio ?? undefined}
        />
      </div>
    </div>
  )
}
