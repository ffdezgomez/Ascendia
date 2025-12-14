import express from 'express'
import * as habitController from '../controllers/habitController.js'
import type { Request, Response, NextFunction } from 'express'
const router = express.Router()

type AuthedRequest = Request & { currentUserId: string; session?: any }
type AuthedHandler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown

function requireAuth(req: Request & { currentUserId?: string; session?: any }, res: Response, next: NextFunction) {
  const sessionUser = req.session?.user
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  req.currentUserId = sessionUser.userId
  next()
}

// Aplicamos middleware a todas las rutas
router.use(requireAuth)

function withAuthedHandler(handler: AuthedHandler) {
  return (req: Request, res: Response, next: NextFunction) => handler(req as AuthedRequest, res, next)
}
router.post('/', withAuthedHandler(habitController.createHabit))
router.get('/', withAuthedHandler(habitController.getHabits))
router.get('/:id', withAuthedHandler(habitController.getHabitById))
router.put('/:id', withAuthedHandler(habitController.updateHabit))
router.delete('/:id', withAuthedHandler(habitController.deleteHabit))

export default router
