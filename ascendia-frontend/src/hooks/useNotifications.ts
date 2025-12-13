import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { NotificationsApi } from '../lib/notifications'
import type { NotificationListResponse, NotificationPayload } from '../types/notification'
import { getSocket } from '../lib/realtime'

const EVENT_NEW = 'notification:new'
const EVENT_UPDATE = 'notification:update'
const EVENT_BULK = 'notification:bulk_read'
const EVENT_DELETE = 'notification:delete'

export function useNotifications(limit = 20) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['notifications', { limit }], [limit])

  const query = useQuery({
    queryKey,
    queryFn: () => NotificationsApi.list(limit),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    let mounted = true
    let activeSocket: Socket | null = null

    function updateState(updater: (current: NotificationListResponse | undefined) => NotificationListResponse | undefined) {
      queryClient.setQueryData<NotificationListResponse | undefined>(queryKey, updater)
    }

    const handleNew = (notification: NotificationPayload) => {
      updateState((current) => {
        const base = current ?? { notifications: [], unreadCount: 0 }
        const without = base.notifications.filter((item) => item.id !== notification.id)
        const notifications = [notification, ...without].slice(0, limit)
        const unreadCount = notification.read ? base.unreadCount : base.unreadCount + 1
        return { notifications, unreadCount }
      })
    }

    const handleUpdate = (notification: NotificationPayload) => {
      updateState((current) => {
        if (!current) return current
        const index = current.notifications.findIndex((item) => item.id === notification.id)
        if (index === -1) return current
        const previous = current.notifications[index]
        const delta = Number(previous.read === false && notification.read === true)
        const notifications = [...current.notifications]
        notifications[index] = notification
        return {
          notifications,
          unreadCount: Math.max(0, current.unreadCount - delta)
        }
      })
    }

    const handleBulk = () => {
      updateState((current) => {
        if (!current) return current
        return {
          notifications: current.notifications.map((item) => item.read ? item : { ...item, read: true, readAt: item.readAt ?? new Date().toISOString() }),
          unreadCount: 0
        }
      })
    }

    const handleDelete = ({ id }: { id: string }) => {
      updateState((current) => {
        if (!current) return current
        const index = current.notifications.findIndex((item) => item.id === id)
        if (index === -1) return current
        const removed = current.notifications[index]
        const notifications = current.notifications.filter((item) => item.id !== id)
        return {
          notifications,
          unreadCount: Math.max(0, current.unreadCount - (removed.read ? 0 : 1))
        }
      })
    }

    const setup = async () => {
      const socket = await getSocket()
      if (!socket || !mounted) return
      activeSocket = socket
      socket.on(EVENT_NEW, handleNew)
      socket.on(EVENT_UPDATE, handleUpdate)
      socket.on(EVENT_BULK, handleBulk)
      socket.on(EVENT_DELETE, handleDelete)
    }

    void setup()

    return () => {
      mounted = false
      if (!activeSocket) return
      activeSocket.off(EVENT_NEW, handleNew)
      activeSocket.off(EVENT_UPDATE, handleUpdate)
      activeSocket.off(EVENT_BULK, handleBulk)
      activeSocket.off(EVENT_DELETE, handleDelete)
      activeSocket = null
    }
  }, [limit, queryClient, queryKey])

  const markAsRead = useCallback(async (notificationId: string) => {
    const updated = await NotificationsApi.markRead(notificationId)
    queryClient.setQueryData<NotificationListResponse | undefined>(queryKey, (current) => {
      if (!current) return current
      const index = current.notifications.findIndex((item) => item.id === notificationId)
      if (index === -1) return current
      const previous = current.notifications[index]
      const notifications = [...current.notifications]
      notifications[index] = updated
      const delta = Number(previous.read === false && updated.read === true)
      return {
        notifications,
        unreadCount: Math.max(0, current.unreadCount - delta)
      }
    })
    return updated
  }, [queryClient, queryKey])

  const markAllAsRead = useCallback(async () => {
    await NotificationsApi.markAllRead()
    const now = new Date().toISOString()
    queryClient.setQueryData<NotificationListResponse | undefined>(queryKey, (current) => {
      if (!current) return current
      return {
        notifications: current.notifications.map((item) => item.read ? item : { ...item, read: true, readAt: item.readAt ?? now }),
        unreadCount: 0
      }
    })
  }, [queryClient, queryKey])

  const deleteNotification = useCallback(async (notificationId: string) => {
    await NotificationsApi.delete(notificationId)
    queryClient.setQueryData<NotificationListResponse | undefined>(queryKey, (current) => {
      if (!current) return current
      const removed = current.notifications.find((item) => item.id === notificationId)
      if (!removed) return current
      return {
        notifications: current.notifications.filter((item) => item.id !== notificationId),
        unreadCount: Math.max(0, current.unreadCount - (removed.read ? 0 : 1))
      }
    })
  }, [queryClient, queryKey])

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: query.refetch
  }
}
