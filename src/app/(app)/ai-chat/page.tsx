'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Sparkles, Send } from 'lucide-react'
import { joinGroup } from '@/app/(app)/events/actions'

type GroupResult = {
  groupId: string
  eventId: string
  sport: string
  sportIcon: string | null
  title: string
  scheduledAt: string
  location: string | null
  memberCount: number
  city: string | null
}

type MsgEntry = { kind: 'msg'; id: string; role: 'user' | 'assistant'; content: string }
type GroupsEntry = { kind: 'groups'; id: string; loading: boolean; groups: GroupResult[] }
type ChatEntry = MsgEntry | GroupsEntry

type GroqMessage = { role: 'user' | 'assistant'; content: string }

function parseMatchReady(text: string): { sport: string; city: string; time: string } | null {
  if (!text.startsWith('MATCH_READY')) return null
  const parts = text.split('|')
  const get = (prefix: string) => {
    const part = parts.find((p) => p.startsWith(prefix))
    if (!part) return ''
    const idx = part.indexOf(':')
    return idx >= 0 ? part.slice(idx + 1).trim() : ''
  }
  return { sport: get('sport'), city: get('city'), time: get('time') }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function GroupCard({ group }: { group: GroupResult }) {
  const [isPending, startTransition] = useTransition()
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleJoin() {
    startTransition(async () => {
      const result = await joinGroup(group.groupId, group.eventId)
      if (result?.error) {
        setError(result.error)
      } else {
        setJoined(true)
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 flex-wrap">
        {group.sportIcon && <span className="text-base">{group.sportIcon}</span>}
        <span className="text-xs font-medium text-gray-500">{group.sport}</span>
        {group.city && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {group.city}
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span>📅 {formatDateTime(group.scheduledAt)}</span>
        {group.location && <span>📍 {group.location}</span>}
        <span>👥 {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {joined ? (
        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Joined ✓
        </span>
      ) : (
        <button
          onClick={handleJoin}
          disabled={isPending}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
        >
          {isPending ? 'Joining…' : 'Join Group'}
        </button>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

const INITIAL_GREETING =
  "Hi! 👋 I'm your AI sports matching assistant. I'll help you find a group to play with today. Let's start — what sport do you want to play?"

export default function AiChatPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([
    { kind: 'msg', id: 'init', role: 'assistant', content: INITIAL_GREETING },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (isInitialMount.current) {
      el.scrollTop = el.scrollHeight
      isInitialMount.current = false
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [entries, loading])

  function getMsgHistory(): GroqMessage[] {
    return entries
      .filter((e): e is MsgEntry => e.kind === 'msg')
      .map((e) => ({ role: e.role, content: e.content }))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const userEntry: MsgEntry = {
      kind: 'msg',
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }

    setEntries((prev) => [...prev, userEntry])

    const history: GroqMessage[] = [
      ...getMsgHistory(),
      { role: 'user', content: text },
    ]

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data: { content?: string; error?: string } = await res.json()
      const content = data.content ?? 'Sorry, something went wrong.'

      const match = parseMatchReady(content)
      if (match) {
        const confirmEntry: MsgEntry = {
          kind: 'msg',
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Perfect! Looking for **${match.sport}** groups in **${match.city}** around **${match.time}**…`,
        }
        const groupsEntryId = crypto.randomUUID()
        const groupsEntry: GroupsEntry = {
          kind: 'groups',
          id: groupsEntryId,
          loading: true,
          groups: [],
        }

        setEntries((prev) => [...prev, confirmEntry, groupsEntry])

        const groupsRes = await fetch('/api/find-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sport: match.sport, city: match.city }),
        })
        const groupsData: { groups?: GroupResult[] } = await groupsRes.json()

        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === groupsEntryId
              ? { ...entry, loading: false, groups: groupsData.groups ?? [] }
              : entry,
          ),
        )
      } else {
        const assistantEntry: MsgEntry = {
          kind: 'msg',
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
        }
        setEntries((prev) => [...prev, assistantEntry])
      }
    } catch {
      setEntries((prev) => [
        ...prev,
        {
          kind: 'msg',
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I had trouble connecting. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 shrink-0">
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">AI Match</h1>
          <p className="text-xs text-gray-500">Find your perfect sports group</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        {entries.map((entry) => {
          if (entry.kind === 'groups') {
            return (
              <div key={entry.id} className="space-y-2">
                {entry.loading ? (
                  <div className="flex items-center gap-2 px-1">
                    <TypingDots />
                    <span className="text-xs text-gray-500">Searching for groups…</span>
                  </div>
                ) : entry.groups.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                    No open groups found for that sport and city right now. Try creating one!
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 px-1">
                      Found {entry.groups.length} group{entry.groups.length !== 1 ? 's' : ''}:
                    </p>
                    {entry.groups.map((g) => (
                      <GroupCard key={`${g.groupId}-${g.eventId}`} group={g} />
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const isUser = entry.role === 'user'
          return (
            <div key={entry.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {entry.content}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 flex items-center gap-2 border-t border-gray-100 bg-white px-4 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={loading}
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white disabled:opacity-60 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 hover:scale-105 active:scale-95 disabled:opacity-40 transition-all duration-200"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
