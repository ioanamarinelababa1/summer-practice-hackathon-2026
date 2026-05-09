import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateEventForm from './CreateEventForm'

export default async function CreateEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sports } = await supabase
    .from('sports')
    .select('id, name, icon, min_players, max_players')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
          <Link href="/events" className="group inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-green-600 transition-all duration-200">
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Cancel
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {sports?.length ? (
            <CreateEventForm sports={sports} />
          ) : (
            <p className="text-sm text-gray-500">No sports available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
