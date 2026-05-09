'use client'

import { useState } from 'react'
import { completeOnboarding, type SkillLevel } from '../profile/actions'

export type SportOption = { id: string; name: string; icon: string | null }

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']

export default function OnboardingForm({
  sports,
  currentUsername,
  currentBio,
  currentSkillLevel,
}: {
  sports: SportOption[]
  currentUsername?: string
  currentBio?: string
  currentSkillLevel?: SkillLevel
}) {
  const [username, setUsername] = useState(currentUsername ?? '')
  const [bio, setBio] = useState(currentBio ?? '')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(currentSkillLevel ?? 'beginner')
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleSport(id: string) {
    setSelectedSports((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await completeOnboarding({
      username: username.trim(),
      bio: bio.trim() || undefined,
      skill_level: skillLevel,
      sport_selections: Array.from(selectedSports).map((sport_id) => ({
        sport_id,
        skill_level: skillLevel,
      })),
    })
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="your_username"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Bio <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell others a bit about yourself…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
        />
      </div>

      {/* Skill level */}
      <div>
        <label htmlFor="skill_level" className="block text-sm font-medium text-gray-700 mb-1">
          Overall skill level
        </label>
        <select
          id="skill_level"
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          {SKILL_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Sports */}
      {sports.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            Sports <span className="text-gray-400 font-normal">(optional)</span>
          </p>
          <ul className="space-y-2">
            {sports.map((sport) => (
              <li key={sport.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`sport-${sport.id}`}
                  checked={selectedSports.has(sport.id)}
                  onChange={() => toggleSport(sport.id)}
                />
                <label htmlFor={`sport-${sport.id}`} className="text-sm text-gray-800 cursor-pointer">
                  {sport.icon && <span className="mr-1">{sport.icon}</span>}
                  {sport.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  )
}
