'use client'

import { useState } from 'react'
import { updateEvent } from '../../actions'

export type EditEventInitial = {
  title: string
  description: string
  location: string
  venue_name: string
  scheduled_at: string
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors'

export default function EditEventForm({
  eventId,
  groupId,
  initial,
  sportName,
  sportIcon,
}: {
  eventId: string
  groupId: string
  initial: EditEventInitial
  sportName: string
  sportIcon: string | null
}) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [location, setLocation] = useState(initial.location)
  const [venueName, setVenueName] = useState(initial.venue_name)
  const [scheduledAt, setScheduledAt] = useState(initial.scheduled_at)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) return
    setError(null)
    setSubmitting(true)

    const result = await updateEvent(eventId, groupId, {
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
      {/* Sport — read-only */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {sportIcon && <span>{sportIcon}</span>}
          <span>{sportName}</span>
        </div>
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
          className={INPUT}
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
          className={INPUT}
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
          className={INPUT}
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
          className={INPUT}
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
          className={`${INPUT} resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
