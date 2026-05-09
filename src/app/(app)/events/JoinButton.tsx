'use client'

import { useTransition } from 'react'
import { joinGroup } from './actions'

export default function JoinButton({
  groupId,
  eventId,
}: {
  groupId: string
  eventId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleJoin() {
    startTransition(async () => {
      await joinGroup(groupId, eventId)
    })
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isPending}
      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? '…' : 'Join'}
    </button>
  )
}
