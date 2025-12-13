// src/controllers/habitController.ts
import Habit from '../models/habit'
import User from '../models/user'
import type { Request, Response, NextFunction } from 'express'

const ALLOWED_CATEGORIES = [
  'fitness',
  'study',
  'health',
  'personal',
  'work',
  'creativity',
  'spirituality',
  'home',
] as const
type HabitCategory = (typeof ALLOWED_CATEGORIES)[number]

function normalizeCategory(raw: any): HabitCategory {
  if (ALLOWED_CATEGORIES.includes(raw)) {
    return raw
  }
  // Si no viene o viene algo raro → lo mandamos a 'personal'
  return 'personal'
}

// Crear hábito
export async function createHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId

    const {
      name,
      description,
      type,
      unit,
      category,
    } = req.body

    const habit = await Habit.create({
      name,
      description,
      type,
      unit,
      category: normalizeCategory(category),
      user: userId,
    })

    // Añade este hábito al array de habits del usuario
    await User.findByIdAndUpdate(userId, { $push: { habits: habit._id } })

    res.status(201).json(habit)
  } catch (err) {
    next(err)
  }
}

// Listar hábitos del usuario
export async function getHabits(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const habits = await Habit.find({ user: userId }).populate('logs')
    res.json(habits)
  } catch (err) {
    next(err)
  }
}

// Obtener hábito por ID (solo si pertenece al usuario)
export async function getHabitById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { id } = req.params

    const habit = await Habit.findOne({ _id: id, user: userId }).populate('logs')
    if (!habit) {
      return res.status(404).json({ error: 'Hábito no encontrado o no autorizado' })
    }

    res.json(habit)
  } catch (err) {
    next(err)
  }
}

// Update
export async function updateHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const habitId = req.params.id

    const {
      name,
      description,
      type,
      unit,
      category,
      ...rest // por si llega algo más
    } = req.body

    const update: any = {
      ...rest,
    }

    if (name !== undefined) update.name = name
    if (description !== undefined) update.description = description
    if (type !== undefined) update.type = type
    if (unit !== undefined) update.unit = unit
    if (category !== undefined) update.category = normalizeCategory(category)

    const updatedHabit = await Habit.findOneAndUpdate(
      { _id: habitId, user: userId },
      update,
      { new: true },
    )

    if (!updatedHabit) {
      return res.status(404).json({ message: 'Hábito no encontrado' })
    }

    res.json(updatedHabit)
  } catch (err) {
    next(err)
  }
}

// Delete
export async function deleteHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const habitId = req.params.id

    const deletedHabit = await Habit.findOneAndDelete({ _id: habitId, user: userId })
    if (!deletedHabit) {
      return res.status(404).json({ message: 'Hábito no encontrado' })
    }

    // Elimina el hábito del array de habits del usuario
    await User.findByIdAndUpdate(userId, { $pull: { habits: habitId } })

    res.json({ message: 'Hábito eliminado' })
  } catch (err) {
    next(err)
  }
}