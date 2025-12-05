import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications'

const r = Router()

r.use(requireAuth({ allowBypass: false }))

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
