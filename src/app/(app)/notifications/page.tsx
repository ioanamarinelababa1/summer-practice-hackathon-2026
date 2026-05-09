import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsList, { type Notification } from './NotificationsList'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('id, type, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications: Notification[] = (data ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as string,
    message: n.message as string,
    read: n.read as boolean,
    created_at: n.created_at as string,
  }))

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {unreadCount} unread
            </span>
          )}
        </div>

        <NotificationsList initial={notifications} />
      </div>
    </div>
  )
}
