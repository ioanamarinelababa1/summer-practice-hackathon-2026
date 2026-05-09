import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatView, { type ChatMessage } from './ChatView'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify group exists and fetch sport info
  const { data: group } = await supabase
    .from('groups')
    .select('id, captain_id, sports(name, icon)')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Fetch members to verify access and build username map
  const { data: membersData } = await supabase
    .from('group_members')
    .select('user_id, profiles(username)')
    .eq('group_id', id)

  const isMember = (membersData ?? []).some((m) => m.user_id === user.id)
  const isCaptain = group.captain_id === user.id
  if (!isMember && !isCaptain) notFound()

  const memberUsernames: Record<string, string> = {}
  for (const m of membersData ?? []) {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    memberUsernames[m.user_id as string] =
      (profile as { username: string } | null)?.username ?? 'Unknown'
  }

  // Last 50 messages, oldest first
  const { data: messagesData } = await supabase
    .from('messages')
    .select('id, content, created_at, user_id')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const initialMessages: ChatMessage[] = ((messagesData ?? []).reverse()).map((m) => ({
    id: m.id as string,
    content: m.content as string,
    created_at: m.created_at as string,
    user_id: m.user_id as string,
    username: memberUsernames[m.user_id as string] ?? 'Unknown',
  }))

  const sport = Array.isArray(group.sports) ? group.sports[0] : group.sports
  const sportName = (sport as { name: string } | null)?.name ?? 'Group'
  const sportIcon = (sport as { icon: string | null } | null)?.icon ?? null

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link
          href={`/groups/${id}`}
          className="text-gray-500 hover:text-gray-700 text-lg leading-none"
        >
          ←
        </Link>
        {sportIcon && <span className="text-xl">{sportIcon}</span>}
        <h1 className="text-sm font-semibold text-gray-900">{sportName} Chat</h1>
      </div>

      <ChatView
        groupId={id}
        currentUserId={user.id}
        initialMessages={initialMessages}
        memberUsernames={memberUsernames}
      />
    </div>
  )
}
