import React from 'react'
import { useNotifications } from '../hooks/useNotifications'
import type { NotificationPayload, NotificationType } from '../types/notification'
import { useNavigate } from 'react-router-dom'

const typeConfig: Record<NotificationType, { label: string; badgeClass: string }> = {
  challenge_invite: { label: 'RET', badgeClass: 'bg-sky-500/15 text-sky-300' },
  challenge_finish_request: { label: 'CER', badgeClass: 'bg-amber-500/15 text-amber-300' },
  challenge_finished: { label: 'FIN', badgeClass: 'bg-emerald-500/15 text-emerald-200' },
  friend_request_received: { label: 'AMG', badgeClass: 'bg-violet-500/15 text-violet-200' },
  friend_request_accepted: { label: 'OK', badgeClass: 'bg-emerald-500/15 text-emerald-200' }
}

const routeMap: Partial<Record<NotificationType, string>> = {
  challenge_invite: '/challenges',
  challenge_finish_request: '/challenges',
  challenge_finished: '/challenges',
  friend_request_received: '/friends',
  friend_request_accepted: '/friends'
}

const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

function formatRelative(dateString: string) {
  const value = new Date(dateString)
  if (Number.isNaN(value.getTime())) return ''
  const diffSeconds = Math.round((value.getTime() - Date.now()) / 1000)
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Infinity, unit: 'year' }
  ]

  let duration = diffSeconds
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return relativeTime.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return ''
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const config = typeConfig[type]
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-xl text-[11px] font-semibold uppercase tracking-wide ${config.badgeClass}`}>
      {config.label}
    </span>
  )
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hasUnread = unreadCount > 0

  React.useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleNotificationClick = async (item: NotificationPayload) => {
    if (!item.read) {
      await markAsRead(item.id)
    }
    const target = routeMap[item.type]
    if (target) {
      navigate(target)
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative rounded-full p-2 ring-1 transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
          hasUnread
            ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/50 hover:bg-emerald-500/25 hover:text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
            : 'bg-zinc-900/80 text-zinc-400 ring-white/5 hover:bg-zinc-900 hover:text-white'
        }`}
        aria-label="Notificaciones"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-emerald-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-white/5 bg-zinc-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Notificaciones</p>
            {unreadCount > 0 && (
              <button className="text-xs font-medium text-emerald-400 hover:text-emerald-300" onClick={() => { void markAllAsRead() }}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {isLoading ? (
            <p className="py-4 text-center text-sm text-zinc-500">Cargando...</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">No tienes notificaciones.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${notification.read ? 'border-white/5 bg-zinc-900/60 hover:bg-zinc-900' : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                  >
                    <div className="flex items-start gap-3">
                      <NotificationIcon type={notification.type} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{notification.title}</p>
                        <p className="text-xs text-zinc-400">{notification.message}</p>
                        <span className="text-[11px] text-zinc-500">{formatRelative(notification.createdAt)}</span>
                      </div>
                      {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
