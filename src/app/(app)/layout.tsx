import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from './NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar unreadCount={count ?? 0} />
      <main className="md:pt-14 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
