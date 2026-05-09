import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from './actions'

const SKILL_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

const SKILL_BADGE: Record<string, string> = {
  beginner:     'bg-green-50 text-green-600 border border-green-200',
  intermediate: 'bg-green-100 text-green-700 border border-green-300',
  advanced:     'bg-green-600 text-white border border-green-600',
}

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

  const skillKey = profile.skill_level as keyof typeof SKILL_LABELS

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Green avatar */}
              <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-sm">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{profile.username}</h1>
                {/* Skill badge */}
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${SKILL_BADGE[profile.skill_level] ?? 'bg-gray-100 text-gray-500'}`}>
                  {SKILL_LABELS[skillKey] ?? profile.skill_level}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/profile/edit"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
              >
                Edit
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="mt-4 text-sm text-gray-400 italic">No bio yet.</p>
          )}
        </div>

        {/* Sports card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Sports
          </h2>

          {(!userSports || userSports.length === 0) ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">No sports added yet.</p>
              <Link
                href="/onboarding"
                className="text-sm font-medium text-green-600 hover:text-green-700 underline transition-colors"
              >
                Add sports →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {userSports.map((us) => {
                const sport = Array.isArray(us.sports) ? us.sports[0] : us.sports
                if (!sport) return null
                const sportSkill = us.skill_level as string
                return (
                  <li
                    key={(sport as { id: string }).id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 hover:bg-green-50 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2">
                      {(sport as { icon: string | null }).icon && (
                        <span className="text-lg">{(sport as { icon: string | null }).icon}</span>
                      )}
                      <span className="text-sm font-medium text-gray-800">
                        {(sport as { name: string }).name}
                      </span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SKILL_BADGE[sportSkill] ?? 'bg-gray-100 text-gray-500'}`}>
                      {SKILL_LABELS[sportSkill as keyof typeof SKILL_LABELS] ?? sportSkill}
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
