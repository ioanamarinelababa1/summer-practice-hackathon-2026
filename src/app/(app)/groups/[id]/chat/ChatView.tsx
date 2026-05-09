'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from './actions'
import type { SendMessageResult } from './actions'

export type ChatMessage = {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatView({
  groupId,
  currentUserId,
  initialMessages,
  memberUsernames,
}: {
  groupId: string
  currentUserId: string
  initialMessages: ChatMessage[]
  memberUsernames: Record<string, string>
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  // Scroll to bottom — instant on mount, smooth on new messages
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (isInitialMount.current) {
      el.scrollTop = el.scrollHeight
      isInitialMount.current = false
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            content: string
            created_at: string
            user_id: string
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [
              ...prev,
              {
                id: row.id,
                content: row.content,
                created_at: row.created_at,
                user_id: row.user_id,
                username: memberUsernames[row.user_id] ?? 'Unknown',
              },
            ]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, memberUsernames])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setInput('')
    setError(null)
    setSending(true)

    const result: SendMessageResult = await sendMessage(groupId, trimmed)

    if (result.error) {
      setError(result.error)
      setInput(trimmed) // restore so the user can retry
    } else if (result.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message!.id)) return prev
        return [
          ...prev,
          {
            id: result.message!.id,
            content: trimmed,
            created_at: result.message!.created_at,
            user_id: result.message!.user_id,
            username: memberUsernames[result.message!.user_id] ?? 'Unknown',
          },
        ]
      })
    }

    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            No messages yet. Say hi!
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.user_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="text-xs text-gray-400 mb-1 px-1">
                {!isMe && (
                  <span className="font-medium text-gray-500">
                    {msg.username}{' '}
                  </span>
                )}
                {formatTime(msg.created_at)}
              </span>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-gray-900 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-1 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </p>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-gray-700 transition-colors"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
