import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const SKILL_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: userSports }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, bio, avatar_url, skill_level, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_sports')
      .select('skill_level, sports(id, name, icon)')
      .eq('user_id', user.id),
  ])

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-500 shrink-0">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{profile.username}</h1>
                <p className="text-sm text-gray-500">
                  {SKILL_LABELS[profile.skill_level as keyof typeof SKILL_LABELS] ?? profile.skill_level}
                </p>
              </div>
            </div>
            <Link
              href="/profile/edit"
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          )}

          {!profile.bio && (
            <p className="mt-4 text-sm text-gray-400 italic">No bio yet.</p>
          )}
        </div>

        {/* Sports card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Sports
          </h2>

          {(!userSports || userSports.length === 0) ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">No sports added yet.</p>
              <Link
                href="/onboarding"
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                Add sports →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {userSports.map((us) => {
                const sport = Array.isArray(us.sports) ? us.sports[0] : us.sports
                if (!sport) return null
                return (
                  <li
                    key={(sport as { id: string }).id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      {(sport as { icon: string | null }).icon && (
                        <span className="text-lg">{(sport as { icon: string | null }).icon}</span>
                      )}
                      <span className="text-sm font-medium text-gray-800">
                        {(sport as { name: string }).name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {SKILL_LABELS[us.skill_level as keyof typeof SKILL_LABELS] ?? us.skill_level}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
