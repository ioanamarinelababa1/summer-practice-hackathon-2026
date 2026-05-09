import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from './actions'

const SKILL_LABELS = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:py-12">
      <div className="max-w-lg mx-auto space-y-4 md:space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">

          {/* Avatar + name row — stacked on mobile, side-by-side on md+ */}
          <div className="flex flex-col items-center text-center gap-3 sm:flex-row sm:items-start sm:text-left sm:gap-4">

            {/* Avatar — bigger on mobile */}
            <div className="h-20 w-20 shrink-0 rounded-full bg-green-600 flex items-center justify-center text-3xl font-bold text-white shadow-sm sm:h-16 sm:w-16 sm:text-2xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>

            {/* Name + badge */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                {profile.username}
              </h1>
              <span
                className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  SKILL_BADGE[profile.skill_level] ?? 'bg-gray-100 text-gray-500'
                }`}
              >
                {SKILL_LABELS[skillKey] ?? profile.skill_level}
              </span>
            </div>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <p className="mt-4 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="mt-4 text-sm text-gray-400 italic">No bio yet.</p>
          )}

          {/* Action buttons — full-width stacked on mobile, inline on sm+ */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Link
              href="/profile/edit"
              className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-700 text-center hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Edit profile
            </Link>
            <form action={logout} className="flex-1 sm:flex-none">
              <button
                type="submit"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        {/* Sports card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Sports
          </h2>

          {(!userSports || userSports.length === 0) ? (
            <div className="text-center py-8">
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
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3.5 md:py-3 hover:bg-green-50 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      {(sport as { icon: string | null }).icon && (
                        <span className="text-xl md:text-lg">
                          {(sport as { icon: string | null }).icon}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-800">
                        {(sport as { name: string }).name}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        SKILL_BADGE[sportSkill] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
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
