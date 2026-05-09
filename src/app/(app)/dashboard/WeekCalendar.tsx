'use client'

import { useOptimistic, useTransition } from 'react'
import { setAvailability } from './actions'

export type DaySlot = {
  date: string
  label: string
  isAvailable: boolean | null
}

export default function WeekCalendar({ days }: { days: DaySlot[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticDays, updateOptimistic] = useOptimistic<
    DaySlot[],
    { date: string; value: boolean }
  >(days, (state, { date, value }) =>
    state.map((d) => (d.date === date ? { ...d, isAvailable: value } : d)),
  )

  function toggle(date: string, current: boolean | null) {
    const next = current !== true
    startTransition(async () => {
      updateOptimistic({ date, value: next })
      await setAvailability(date, next)
    })
  }

  return (
    <ul className="divide-y divide-gray-100">
      {optimisticDays.map((day) => {
        const isAvail = day.isAvailable

        return (
          <li key={day.date} className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-700">{day.label}</span>
            <button
              onClick={() => toggle(day.date, day.isAvailable)}
              disabled={isPending}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                isAvail === true
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isAvail === false
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {isAvail === true ? '✓ Available' : isAvail === false ? '✗ Unavailable' : 'Set'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
