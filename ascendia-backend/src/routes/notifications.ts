import { Router } from 'express'
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications'

const r = Router()

function requireAuth(req: any, res: any, next: any) {
  const sessionUser = req.session?.user
  if (!sessionUser?.userId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  req.currentUserId = sessionUser.userId
  next()
}

r.use(requireAuth)

r.get('/', async (req: any, res: any, next: any) => {
  try {
    const limit = Number(req.query?.limit ?? 20)
    const { notifications, unreadCount } = await listNotifications(req.currentUserId, { limit })
    res.json({ notifications, unreadCount })
  } catch (err) {
    next(err)
  }
})

r.post('/:notificationId/read', async (req: any, res: any, next: any) => {
  try {
    const notification = await markNotificationRead(req.currentUserId, req.params.notificationId)
    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' })
    }
    res.json({ notification })
  } catch (err) {
    next(err)
  }
})

r.post('/read-all', async (req: any, res: any, next: any) => {
  try {
    const result = await markAllNotificationsRead(req.currentUserId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

r.delete('/:notificationId', async (req: any, res: any, next: any) => {
  try {
    const deleted = await deleteNotification(req.currentUserId, req.params.notificationId)
    if (!deleted) {
      return res.status(404).json({ error: 'Notificación no encontrada' })
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default r
