import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </div>
  )
}
