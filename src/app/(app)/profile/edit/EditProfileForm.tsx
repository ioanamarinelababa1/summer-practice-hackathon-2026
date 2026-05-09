'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateProfile, type SkillLevel } from '../actions'

// ── Schema ───────────────────────────────────────────────────────────────────

const skillLevels = ['beginner', 'intermediate', 'advanced'] as const

const SportRowSchema = z.object({
  sport_id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  selected: z.boolean(),
  skill_level: z.enum(skillLevels),
})

const EditProfileSchema = z.object({
  bio: z.string().max(300, 'Max 300 characters').optional(),
  skill_level: z.enum(skillLevels),
  sports: z
    .array(SportRowSchema)
    .refine((arr) => arr.some((s) => s.selected), {
      message: 'Select at least one sport',
    }),
})

type FormValues = z.infer<typeof EditProfileSchema>

// ── Types ────────────────────────────────────────────────────────────────────

export type SportOption = {
  id: string
  name: string
  icon: string | null
  current_skill_level?: SkillLevel
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors'

// ── Component ────────────────────────────────────────────────────────────────

export default function EditProfileForm({
  sports,
  currentSkillLevel,
  currentBio,
}: {
  sports: SportOption[]
  currentSkillLevel?: SkillLevel
  currentBio?: string
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: {
      bio: currentBio ?? '',
      skill_level: currentSkillLevel ?? 'beginner',
      sports: sports.map((s) => ({
        sport_id: s.id,
        name: s.name,
        icon: s.icon,
        selected: !!s.current_skill_level,
        skill_level: s.current_skill_level ?? 'beginner',
      })),
    },
  })

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = form

  const sportRows = watch('sports')

  const onSubmit = handleSubmit(async (data) => {
    const result = await updateProfile({
      bio: data.bio || undefined,
      skill_level: data.skill_level,
      sport_selections: data.sports
        .filter((s) => s.selected)
        .map((s) => ({ sport_id: s.sport_id, skill_level: s.skill_level })),
    })
    if (result?.error) {
      setError('root', { message: result.error })
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Bio <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          placeholder="Tell others a bit about yourself…"
          className={`${INPUT} resize-none`}
          {...register('bio')}
        />
        {errors.bio && (
          <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>
        )}
      </div>

      {/* Overall skill level */}
      <div>
        <label htmlFor="skill_level" className="block text-sm font-medium text-gray-700 mb-1">
          Overall skill level
        </label>
        <select
          id="skill_level"
          className={INPUT}
          {...register('skill_level')}
        >
          {skillLevels.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Sports */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Sports you play</p>

        <div className="space-y-2">
          {sportRows.map((row, idx) => (
            <div
              key={row.sport_id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                row.selected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <input type="hidden" {...register(`sports.${idx}.sport_id`)} />
              <input type="hidden" {...register(`sports.${idx}.name`)} />

              <input
                type="checkbox"
                id={`sport-${row.sport_id}`}
                checked={row.selected}
                onChange={(e) =>
                  setValue(`sports.${idx}.selected`, e.target.checked, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />

              <label
                htmlFor={`sport-${row.sport_id}`}
                className="flex flex-1 items-center gap-2 cursor-pointer select-none"
              >
                {row.icon && <span className="text-lg">{row.icon}</span>}
                <span className="text-sm font-medium text-gray-800">{row.name}</span>
              </label>

              {row.selected && (
                <select
                  aria-label={`${row.name} skill level`}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  {...register(`sports.${idx}.skill_level`)}
                >
                  {skillLevels.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        {'message' in (errors.sports ?? {}) && (
          <p className="mt-2 text-xs text-red-600">
            {(errors.sports as { message?: string })?.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {errors.root.message}
        </p>
      )}

      <div className="flex gap-3">
        <a
          href="/profile"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 text-center hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
