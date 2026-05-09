'use client'

import { useState } from 'react'
import { completeOnboarding, type SkillLevel } from '../profile/actions'

export type SportOption = { id: string; name: string; icon: string | null }

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']

const CITIES = [
  'Timișoara',
  'Cluj-Napoca',
  'Alba-Iulia',
  'București',
  'Craiova',
  'Iași',
  'Galați',
  'Arad',
  'Oradea',
  'Târgu-Jiu',
]

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors'

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
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detecting, setDetecting] = useState(false)

  async function handleDetectSports() {
    if (!bio.trim()) return
    setDetecting(true)
    try {
      const res = await fetch('/api/detect-sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })
      if (!res.ok) return
      const { sports: detected }: { sports: string[] } = await res.json()
      const matchedIds = sports
        .filter((s) => detected.some((d) => d.toLowerCase() === s.name.toLowerCase()))
        .map((s) => s.id)
      setSelectedSports((prev) => {
        const next = new Set(prev)
        matchedIds.forEach((id) => next.add(id))
        return next
      })
    } finally {
      setDetecting(false)
    }
  }

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
      city: city || undefined,
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
          className={INPUT}
          placeholder="your_username"
        />
      </div>

      {/* Bio */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <button
            type="button"
            onClick={handleDetectSports}
            disabled={detecting || !bio.trim()}
            className="text-xs font-medium text-green-700 border border-green-300 rounded-md px-2.5 py-1 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {detecting ? 'Detecting…' : 'Auto-detect sports'}
          </button>
        </div>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell others a bit about yourself…"
          className={`${INPUT} resize-none`}
        />
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          City <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={INPUT}
        >
          <option value="">Select your city</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
          className={INPUT}
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
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
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
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  )
}
