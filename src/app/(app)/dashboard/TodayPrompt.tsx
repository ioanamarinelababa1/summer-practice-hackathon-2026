'use client'

import { useOptimistic, useTransition } from 'react'
import { setAvailability } from './actions'

export default function TodayPrompt({
  today,
  initialIsAvailable,
}: {
  today: string
  initialIsAvailable: boolean | null
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticAvail, setOptimisticAvail] = useOptimistic<boolean | null, boolean | null>(
    initialIsAvailable,
    (_, next) => next,
  )

  function handleSet(value: boolean) {
    startTransition(async () => {
      setOptimisticAvail(value)
      await setAvailability(today, value)
    })
  }

  if (optimisticAvail === true) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-lg font-semibold text-green-800">You&apos;re showing up today!</p>
        <p className="mt-1 text-sm text-green-600">Others can see you&apos;re available.</p>
        <button
          onClick={() => handleSet(false)}
          disabled={isPending}
          className="mt-4 text-sm text-green-700 underline disabled:opacity-50"
        >
          Actually, I can&apos;t make it
        </button>
      </div>
    )
  }

  if (optimisticAvail === false) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-4xl mb-2">😴</p>
        <p className="text-lg font-semibold text-gray-700">Not available today</p>
        <p className="mt-1 text-sm text-gray-500">You won&apos;t show up in today&apos;s matches.</p>
        <button
          onClick={() => handleSet(true)}
          disabled={isPending}
          className="mt-4 text-sm text-green-700 underline disabled:opacity-50"
        >
          Wait, I can show up!
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p className="text-2xl font-bold text-gray-900 mb-1">Are you showing up today?</p>
      <p className="text-sm text-gray-500 mb-6">Let others know you&apos;re available to play.</p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => handleSet(true)}
          disabled={isPending}
          className="flex-1 max-w-[160px] rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          YES
        </button>
        <button
          onClick={() => handleSet(false)}
          disabled={isPending}
          className="flex-1 max-w-[160px] rounded-xl border border-gray-300 py-4 text-lg font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          NO
        </button>
      </div>
    </div>
  )
}
