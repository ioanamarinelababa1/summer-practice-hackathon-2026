import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'
import { type SkillLevel } from '../profile/actions'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: sports }] = await Promise.all([
    supabase.from('profiles').select('username, bio, skill_level').eq('id', user.id).single(),
    supabase.from('sports').select('id, name, icon').order('name'),
  ])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Set up your profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tell us about yourself so we can find the right groups for you.
          </p>
        </div>

        <OnboardingForm
          sports={sports ?? []}
          currentUsername={profile?.username ?? undefined}
          currentBio={profile?.bio ?? undefined}
          currentSkillLevel={profile?.skill_level as SkillLevel | undefined}
        />
      </div>
    </div>
  )
}
