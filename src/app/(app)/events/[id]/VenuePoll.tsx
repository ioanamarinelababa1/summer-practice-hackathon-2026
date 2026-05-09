'use client'

import { useState } from 'react'
import { addVoteOption, castVote } from './voteActions'

type VoteOption = { id: string; option_text: string }
type Vote = { user_id: string; option_text: string }

export default function VenuePoll({
  eventId,
  isCaptain,
  isMember,
  currentUserId,
  options,
  votes,
}: {
  eventId: string
  isCaptain: boolean
  isMember: boolean
  currentUserId: string
  options: VoteOption[]
  votes: Vote[]
}) {
  const [newOption, setNewOption] = useState('')
  const [adding, setAdding] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const myVote = votes.find((v) => v.user_id === currentUserId)?.option_text ?? null
  const totalVotes = votes.length
  const voteCounts = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.option_text] = (acc[v.option_text] ?? 0) + 1
    return acc
  }, {})

  async function handleAddOption(e: React.FormEvent) {
    e.preventDefault()
    if (!newOption.trim()) return
    setAdding(true)
    setError(null)
    const result = await addVoteOption(eventId, newOption.trim())
    if (result?.error) setError(result.error)
    else setNewOption('')
    setAdding(false)
  }

  async function handleVote(optionText: string) {
    if (voting) return
    setVoting(optionText)
    setError(null)
    const result = await castVote(eventId, optionText)
    if (result?.error) setError(result.error)
    setVoting(null)
  }

  if (options.length === 0 && !isCaptain) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venue Poll</h2>

      {options.length === 0 ? (
        <p className="text-sm text-gray-400">No options yet — add the first venue below.</p>
      ) : (
        <ul className="space-y-3">
          {options.map((opt) => {
            const count = voteCounts[opt.option_text] ?? 0
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
            const isMyVote = myVote === opt.option_text
            return (
              <li key={opt.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-800 truncate">{opt.option_text}</span>
                    {isMyVote && (
                      <span className="shrink-0 text-xs font-medium text-green-600">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {count} {count === 1 ? 'vote' : 'votes'}
                    </span>
                    {isMember && !isCaptain && (
                      <button
                        onClick={() => handleVote(opt.option_text)}
                        disabled={voting !== null}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                          isMyVote
                            ? 'bg-green-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {voting === opt.option_text ? '…' : isMyVote ? 'Voted' : 'Vote'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isCaptain && options.length < 3 && (
        <form onSubmit={handleAddOption} className="flex gap-2">
          <input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Add venue option…"
            maxLength={120}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <button
            type="submit"
            disabled={adding || !newOption.trim()}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {adding ? '…' : 'Add'}
          </button>
        </form>
      )}

      {isCaptain && options.length >= 3 && (
        <p className="text-xs text-gray-400">Maximum 3 options reached.</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
