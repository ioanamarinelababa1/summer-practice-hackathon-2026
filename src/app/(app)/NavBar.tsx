'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, User, Bell, Activity } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/groups',    label: 'Groups',    icon: Users },
  { href: '/events',   label: 'Events',    icon: Calendar },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile',  label: 'Profile',   icon: User },
]

export default function NavBar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-100 items-center px-6 gap-1">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 mr-6 shrink-0 transition-opacity duration-200 hover:opacity-80"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
            <Activity className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-gray-900">ShowUp2Move</span>
        </Link>

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {/* Label with underline slide-in */}
              <span className="relative pb-px">
                {label}
                {!active && (
                  <span
                    className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-green-500 transition-transform duration-200 group-hover:scale-x-100"
                  />
                )}
              </span>
              {href === '/notifications' && unreadCount > 0 && (
                <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-100 flex items-center">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-medium transition-all duration-200 ${
                active ? 'text-green-600 scale-110' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {href === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
