'use client'

import { useState, useTransition } from 'react'
import { markNotificationRead } from './actions'

export type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationsList({ initial }: { initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [, startTransition] = useTransition()

  function handleClick(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    startTransition(async () => {
      await markNotificationRead(id)
    })
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
        <p className="text-sm text-gray-400">No notifications yet.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {notifications.map((n) => (
        <li key={n.id}>
          <button
            onClick={() => !n.read && handleClick(n.id)}
            className={`w-full text-left rounded-xl border px-5 py-4 transition-colors ${
              n.read
                ? 'bg-white border-gray-200 cursor-default'
                : 'bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm leading-snug ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {n.message}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
