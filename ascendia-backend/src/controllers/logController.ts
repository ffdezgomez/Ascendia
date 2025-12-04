// controllers/logController.ts
import Log from '../models/log'
import Habit from '../models/habit'
import type { Request, Response, NextFunction } from 'express'

// Crear un log (y añadirlo al habit correspondiente)
export async function createLog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { habitId, date, value, amount, note } = req.body

    if (!habitId) {
      return res.status(400).json({ error: 'habitId es requerido' })
    }

    const habit = await Habit.findOne({ _id: habitId, user: userId })
    if (!habit) {
      return res.status(404).json({ error: 'Hábito no encontrado' })
    }

    const rawValue = value ?? amount
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'value debe ser un número positivo' })
    }

    const logDate = date ? new Date(date) : new Date()
    if (Number.isNaN(logDate.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' })
    }

    const dayStart = new Date(logDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const existingLog = await Log.findOne({
      user: userId,
      habit: habitId,
      date: { $gte: dayStart, $lt: dayEnd }
    })

    if (existingLog) {
      if (habit.type === 'boolean') {
        return res.status(409).json({ error: 'Este hábito ya fue registrado hoy' })
      }

      const updatePayload: Record<string, any> = {
        value: parsed,
        date: logDate
      }
      if (note !== undefined) {
        updatePayload.note = note
      }

      const updatedLog = await Log.findOneAndUpdate(
        { _id: existingLog._id },
        updatePayload,
        { new: true }
      )

      return res.status(200).json(updatedLog)
    }

    const createPayload: Record<string, any> = {
      user: userId,
      habit: habitId,
      date: logDate,
      value: parsed
    }
    if (note !== undefined) {
      createPayload.note = note
    }

    const log = await Log.create(createPayload)

    await Habit.updateOne(
      { _id: habitId, user: userId },
      { $push: { logs: log._id } }
    )

    res.status(201).json(log)
  } catch (error) {
    next(error)
  }
}

// Obtener logs por usuario y/o habitId (query habitual: ?habit=ID)
export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const habitId = req.query.habit as string | undefined
    const filter: any = { user: userId }
    if (habitId) filter.habit = habitId

    const dayParam = req.query.day as string | undefined
    if (dayParam) {
      const dayDate = new Date(dayParam)
      if (!Number.isNaN(dayDate.getTime())) {
        const dayStart = new Date(dayDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)
        filter.date = { $gte: dayStart, $lt: dayEnd }
      }
    }

    const logs = await Log.find(filter).sort({ date: -1 })
    res.json(logs)
  } catch (error) {
    next(error)
  }
}

// Obtener un log por ID (solo el dueño)
export async function getLogById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { id } = req.params
    const log = await Log.findOne({ _id: id, user: userId })
    if (!log) return res.status(404).json({ error: 'Log no encontrado' })
    res.json(log)
  } catch (error) {
    next(error)
  }
}

// Actualizar un log por ID (solo el dueño)
export async function updateLog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { id } = req.params
    const { date, value, note } = req.body
    const log = await Log.findOneAndUpdate(
      { _id: id, user: userId },
      { date, value, note },
      { new: true }
    )
    if (!log) return res.status(404).json({ error: 'Log no encontrado' })
    res.json(log)
  } catch (error) {
    next(error)
  }
}

// Borrar un log
export async function deleteLog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { id } = req.params
    const log = await Log.findOneAndDelete({ _id: id, user: userId })
    if (!log) return res.status(404).json({ error: 'Log no encontrado' })
    // Opcional: quitar el log del array de logs en Habit
    await Habit.updateMany({ logs: log._id }, { $pull: { logs: log._id } })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
