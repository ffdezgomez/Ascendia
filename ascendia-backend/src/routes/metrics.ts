import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../config.js'
import * as metricsController from '../controllers/metricsController.js'

const router = express.Router()

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Intentar obtener el token desde cookies
  let token = (req as any).cookies?.access_token
  
  // Si no hay token en cookies, intentar desde Authorization header
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No autenticado - token no proporcionado' })
  }
  
  try {
    const data = jwt.verify(token, SECRET_JWT_KEY) as any
    (req as any).currentUserId = data.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

router.use(requireAuth)

// GET /metrics/habits - Resumen de todos los hábitos
router.get('/habits', metricsController.getAllHabitsMetrics)

// GET /metrics/habit/:habitId - Métricas de un hábito específico
router.get('/habit/:habitId', metricsController.getHabitMetrics)

// GET /metrics/habit/:habitId/compare - Comparativa semanal/mensual
router.get('/habit/:habitId/compare', metricsController.getComparativeMetrics)

export default router