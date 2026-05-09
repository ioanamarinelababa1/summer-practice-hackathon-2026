'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, ShieldCheck } from 'lucide-react'
import { register } from '../actions'

const initialState = { error: null }

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
        <p className="mt-2 text-sm text-gray-500">Join the community and start moving</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="block w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            </span>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <ShieldCheck className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            </span>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={`block w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 ${
                mismatch
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-gray-200 focus:border-green-500 focus:ring-green-500/20'
              }`}
            />
          </div>
          {mismatch && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || mismatch}
          className="w-full rounded-lg bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:opacity-60"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[#16a34a] transition-colors hover:text-[#15803d] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
