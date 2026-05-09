'use client'

import { useState } from 'react'
import { createEvent } from '../actions'

export type Sport = {
  id: string
  name: string
  icon: string | null
  min_players: number
  max_players: number
}

function defaultScheduledAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function CreateEventForm({ sports }: { sports: Sport[] }) {
  const [sportId, setSportId] = useState(sports[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [venueName, setVenueName] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedSport = sports.find((s) => s.id === sportId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt || !sportId) return
    setError(null)
    setSubmitting(true)

    const result = await createEvent({
      sport_id: sportId,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      venue_name: venueName.trim() || undefined,
      scheduled_at: scheduledAt,
    })

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sport */}
      <div>
        <label htmlFor="sport" className="block text-sm font-medium text-gray-700 mb-1">
          Sport
        </label>
        <select
          id="sport"
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon ? `${s.icon} ` : ''}{s.name}
            </option>
          ))}
        </select>
        {selectedSport && (
          <p className="mt-1 text-xs text-gray-400">
            {selectedSport.min_players}–{selectedSport.max_players} players
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunday morning football"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Date & Time */}
      <div>
        <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
          Date &amp; Time
        </label>
        <input
          id="scheduled_at"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Location <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Central Park"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Venue name */}
      <div>
        <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
          Venue Name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="venue_name"
          type="text"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder="e.g. Pitch 3"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any extra details…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* Max players — read-only from sport */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Players</label>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {selectedSport?.max_players ?? '—'}
          <span className="ml-1 text-xs text-gray-400">(determined by sport)</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !title.trim() || !scheduledAt}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Creating…' : 'Create Event'}
      </button>
    </form>
  )
}
