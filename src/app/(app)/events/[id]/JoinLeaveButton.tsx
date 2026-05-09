'use client'

import { useState, useTransition } from 'react'
import { joinGroup, leaveGroup } from '../actions'

export default function JoinLeaveButton({
  groupId,
  eventId,
  isMember,
  isCaptain,
}: {
  groupId: string
  eventId: string
  isMember: boolean
  isCaptain: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isCaptain) {
    return (
      <p className="text-xs text-gray-500 text-center">
        You organised this event.
      </p>
    )
  }

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const result = await joinGroup(groupId, eventId)
      if (result?.error) setError(result.error)
    })
  }

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const result = await leaveGroup(groupId, eventId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-2">
      {isMember ? (
        <button
          onClick={handleLeave}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Leaving…' : 'Leave Event'}
        </button>
      ) : (
        <button
          onClick={handleJoin}
          disabled={isPending}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Joining…' : 'Join Event'}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
