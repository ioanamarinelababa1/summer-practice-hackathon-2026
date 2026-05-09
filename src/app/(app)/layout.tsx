import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from './NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="md:pt-14 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
