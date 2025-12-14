import type { Request, Response, NextFunction } from 'express'
import User from '../models/user.js'
import {
  createChallenge,
  deleteChallenge,
  getChallengeSummary,
  listUserChallenges,
  declineFinishChallenge,
  requestFinishChallenge,
  respondToChallenge
} from '../services/challenges.js'
import { createNotification } from '../services/notifications.js'
import type { ChallengeStatus, ChallengeType } from '../types/challenge.js'
import type { CreateDisciplineInput, HabitDraftInput, RespondChallengeInput } from '../services/challenges.js'

const STATUS_VALUES: ChallengeStatus[] = ['pending', 'active', 'pending_finish', 'finished', 'rejected', 'cancelled']
const TYPE_VALUES: ChallengeType[] = ['personal', 'friend']

type RawHabitDraft = {
  name?: unknown
  type?: unknown
  unit?: unknown
  category?: unknown
  emoji?: unknown
  color?: unknown
  description?: unknown
}

type RawDiscipline = {
  ownerHabitId?: unknown
  challengerHabitId?: unknown
  ownerNewHabit?: RawHabitDraft
  challengerNewHabit?: RawHabitDraft
  dailyGoal?: unknown
}

type HabitDraftParsingResult = {
  provided: boolean
  valid: boolean
  draft?: HabitDraftInput
}

type NormalizedDisciplineResult = {
  payload: CreateDisciplineInput
  ownerDraftProvided: boolean
  ownerDraftValid: boolean
  challengerDraftProvided: boolean
  challengerDraftValid: boolean
}

type AuthenticatedRequest = Request & { currentUserId: string }

function parseHabitDraft(raw?: RawHabitDraft | null): HabitDraftParsingResult {
  if (!raw || typeof raw !== 'object') {
    return { provided: false, valid: false }
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  const unit = typeof raw.unit === 'string' ? raw.unit.trim() : ''
  const hasAnyExtra =
    typeof raw.category === 'string' ||
    typeof raw.emoji === 'string' ||
    typeof raw.color === 'string' ||
    typeof raw.description === 'string'

  const provided = Boolean(name || type || unit || hasAnyExtra)
  if (!provided) {
    return { provided: false, valid: false }
  }

  if (!name || !type || !unit) {
    return { provided: true, valid: false }
  }

  return {
    provided: true,
    valid: true,
    draft: {
      name,
      type,
      unit,
      category: typeof raw.category === 'string' ? (raw.category.trim() as HabitDraftInput['category']) : undefined,
      emoji: typeof raw.emoji === 'string' ? raw.emoji.trim() : undefined,
      color: typeof raw.color === 'string' ? (raw.color.trim() as HabitDraftInput['color']) : undefined,
      description: typeof raw.description === 'string' ? raw.description.trim() : undefined
    }
  }
}

function normalizeDiscipline(raw: RawDiscipline, options: { allowDrafts: boolean }): NormalizedDisciplineResult {
  const ownerHabitId = String(raw?.ownerHabitId ?? '').trim()
  const challengerHabitId = raw?.challengerHabitId != null ? String(raw.challengerHabitId).trim() : ''
  const dailyGoal = raw?.dailyGoal != null && raw.dailyGoal !== '' ? Number(raw.dailyGoal) : undefined

  const ownerDraft = options.allowDrafts ? parseHabitDraft(raw?.ownerNewHabit) : { provided: false, valid: false }
  const challengerDraft = options.allowDrafts ? parseHabitDraft(raw?.challengerNewHabit) : { provided: false, valid: false }

  return {
    payload: {
      ownerHabitId: ownerHabitId || undefined,
      ownerHabitDraft: ownerDraft.valid ? ownerDraft.draft : undefined,
      challengerHabitId: challengerHabitId || undefined,
      challengerHabitDraft: challengerDraft.valid ? challengerDraft.draft : undefined,
      dailyGoal
    },
    ownerDraftProvided: ownerDraft.provided,
    ownerDraftValid: ownerDraft.valid,
    challengerDraftProvided: challengerDraft.provided,
    challengerDraftValid: challengerDraft.valid
  }
}

function parseOptionalDate(value: unknown): Date | undefined | null | 'invalid' {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value === '') return undefined
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    return 'invalid'
  }
  return date
}

async function ensureFriendship(userId: string, friendId: string): Promise<boolean> {
  const user = await User.findById(userId).select('friends').lean()
  if (!user) return false
  return (user.friends || []).some((friend: any) => String(friend) === friendId)
}

export async function getChallenges(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.currentUserId
    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const status = STATUS_VALUES.includes(statusParam as ChallengeStatus) ? (statusParam as ChallengeStatus) : undefined

    const challenges = await listUserChallenges(userId, status)
    const summaries = await Promise.all(challenges.map((challenge) => getChallengeSummary(String(challenge._id), userId)))

    res.json({ viewerId: userId, challenges: summaries })
  } catch (err) {
    next(err)
  }
}

export async function getChallenge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await getChallengeSummary(req.params.challengeId, req.currentUserId)
    res.json({ viewerId: req.currentUserId, challenge })
  } catch (err) {
    next(err)
  }
}

export async function createChallengeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.currentUserId
    const rawType = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : 'friend'
    const type: ChallengeType = TYPE_VALUES.includes(rawType as ChallengeType) ? (rawType as ChallengeType) : 'friend'

    const title = typeof req.body?.title === 'string' ? req.body.title : undefined
    const opponentId = req.body?.opponentId ? String(req.body.opponentId).trim() : undefined

    const startDateResult = parseOptionalDate(req.body?.startDate)
    if (startDateResult === 'invalid') {
      return res.status(400).json({ error: 'startDate no es válida' })
    }
    const startDate = startDateResult === null ? undefined : startDateResult

    const endDateResult = parseOptionalDate(req.body?.endDate)
    if (endDateResult === 'invalid') {
      return res.status(400).json({ error: 'endDate no es válida' })
    }
    const endDate = endDateResult

    const rawDisciplines = Array.isArray(req.body?.disciplines) ? req.body.disciplines : []
    if (rawDisciplines.length === 0) {
      return res.status(400).json({ error: 'Debes añadir al menos una disciplina al reto' })
    }

    const normalizedDisciplines: NormalizedDisciplineResult[] = rawDisciplines.map((discipline: RawDiscipline) =>
      normalizeDiscipline(discipline, { allowDrafts: true })
    )
    const disciplines: CreateDisciplineInput[] = normalizedDisciplines.map((entry) => entry.payload)

    if (disciplines.some((d) => !d.ownerHabitId && !d.ownerHabitDraft)) {
      return res.status(400).json({ error: 'Cada disciplina debe incluir uno de tus hábitos (existente o nuevo)' })
    }

    if (normalizedDisciplines.some((entry) => entry.ownerDraftProvided && !entry.ownerDraftValid)) {
      return res.status(400).json({ error: 'Completa todos los campos del nuevo hábito propio' })
    }

    if (normalizedDisciplines.some((entry) => entry.payload.ownerHabitId && entry.ownerDraftProvided)) {
      return res.status(400).json({ error: 'Selecciona un hábito existente o crea uno nuevo, pero no ambos' })
    }

    if (disciplines.some((d) => d.dailyGoal !== undefined && (!Number.isFinite(d.dailyGoal) || d.dailyGoal <= 0))) {
      return res.status(400).json({ error: 'Cada disciplina necesita un objetivo diario válido' })
    }

    if (type === 'friend') {
      if (!opponentId) {
        return res.status(400).json({ error: 'Debes indicar el amigo a retar' })
      }
      if (opponentId === userId) {
        return res.status(400).json({ error: 'No puedes retarte a ti mismo' })
      }
      if (disciplines.some((d) => !d.challengerHabitId && !d.challengerHabitDraft)) {
        return res.status(400).json({ error: 'Cada disciplina debe incluir un hábito del amigo, existente o nuevo' })
      }
      if (normalizedDisciplines.some((entry) => entry.challengerDraftProvided && !entry.challengerDraftValid)) {
        return res.status(400).json({ error: 'Completa todos los campos del nuevo hábito del amigo' })
      }
      if (normalizedDisciplines.some((entry) => entry.payload.challengerHabitId && entry.challengerDraftProvided)) {
        return res.status(400).json({ error: 'Para el hábito del amigo, selecciona uno existente o define uno nuevo, no ambos' })
      }
      const isFriend = await ensureFriendship(userId, opponentId)
      if (!isFriend) {
        return res.status(403).json({ error: 'Solo puedes retar a tus amigos' })
      }
    }

    const challenge = await createChallenge(userId, {
      type,
      opponentId,
      disciplines,
      startDate,
      endDate,
      title
    })

    const summary = await getChallengeSummary(String(challenge._id), userId)

    if (type === 'friend' && opponentId) {
      const inviterName = (req as any)?.session?.user?.username ?? summary.owner?.username ?? 'Tu amigo'
      const challengeTitle = summary.title ? ` ${summary.title}` : ''
      await createNotification({
        userId: opponentId,
        type: 'challenge_invite',
        title: 'Nuevo reto recibido',
        message: `${inviterName} te ha retado${challengeTitle}.`,
        metadata: {
          challengeId: summary.id
        }
      })
    }

    res.status(201).json({ viewerId: userId, challenge: summary })
  } catch (err) {
    next(err)
  }
}

export async function respondChallengeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const challengeId = req.params.challengeId
    const action = typeof req.body?.action === 'string' ? req.body.action.trim() : ''
    if (!['accept', 'reject', 'modify'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida' })
    }

    const payload: RespondChallengeInput = { action: action as RespondChallengeInput['action'] }

    if (action === 'modify') {
      const startDateResult = parseOptionalDate(req.body?.startDate)
      if (startDateResult === 'invalid') {
        return res.status(400).json({ error: 'startDate no es válida' })
      }
      if (startDateResult !== undefined && startDateResult !== null) {
        payload.startDate = startDateResult
      }

      const endDateResult = parseOptionalDate(req.body?.endDate)
      if (endDateResult === 'invalid') {
        return res.status(400).json({ error: 'endDate no es válida' })
      }
      if (endDateResult !== undefined) {
        payload.endDate = endDateResult
      }

      const rawDisciplines = Array.isArray(req.body?.disciplines) ? req.body.disciplines : []
      if (rawDisciplines.length === 0) {
        return res.status(400).json({ error: 'Debes proponer al menos una disciplina' })
      }
      const disciplines: CreateDisciplineInput[] = rawDisciplines.map((discipline: RawDiscipline) =>
        normalizeDiscipline(discipline, { allowDrafts: false }).payload
      )
      if (disciplines.some((d) => !d.ownerHabitId || !d.challengerHabitId)) {
        return res.status(400).json({ error: 'Cada disciplina debe incluir ambos hábitos' })
      }
        if (disciplines.some((d) => d.dailyGoal !== undefined && (!Number.isFinite(d.dailyGoal) || d.dailyGoal <= 0))) {
          return res.status(400).json({ error: 'Cada disciplina necesita un objetivo diario válido' })
        }
      payload.disciplines = disciplines
    }

    const updated = await respondToChallenge(challengeId, req.currentUserId, payload)
    const summary = await getChallengeSummary(String(updated._id), req.currentUserId)
    res.json({ viewerId: req.currentUserId, challenge: summary })
  } catch (err) {
    next(err)
  }
}

export async function requestFinishHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await requestFinishChallenge(req.params.challengeId, req.currentUserId)
    const summary = await getChallengeSummary(String(challenge._id), req.currentUserId)
    const ownerId = String(challenge.owner)
    const opponentId = challenge.opponent ? String(challenge.opponent) : null
    const requesterName = (req as any)?.session?.user?.username ?? 'Tu amigo'

    if (challenge.status === 'pending_finish') {
      const targetId = req.currentUserId === ownerId ? opponentId : ownerId
      if (targetId) {
        await createNotification({
          userId: targetId,
          type: 'challenge_finish_request',
          title: 'Solicitud para cerrar el reto',
          message: `${requesterName} quiere cerrar ${summary.title || 'este reto'}.`,
          metadata: {
            challengeId: summary.id
          }
        })
      }
    }

    if (challenge.status === 'finished') {
      const message = `Marcador final ${summary.ownerWins}-${summary.opponentWins}${summary.draws ? ` (${summary.draws} empates)` : ''}`
      const metadata = {
        challengeId: summary.id,
        ownerWins: summary.ownerWins,
        opponentWins: summary.opponentWins,
        draws: summary.draws,
        overallWinner: summary.overallWinner,
        finishedAt: (summary.endDate ?? new Date()).toISOString()
      }
      const recipients = [ownerId, opponentId].filter(Boolean) as string[]
      await Promise.all(recipients.map((userId) =>
        createNotification({
          userId,
          type: 'challenge_finished',
          title: `${summary.title || 'Reto'} finalizado`,
          message,
          metadata
        })
      ))
    }

    res.json({ viewerId: req.currentUserId, challenge: summary })
  } catch (err) {
    next(err)
  }
}

export async function declineFinishHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await declineFinishChallenge(req.params.challengeId, req.currentUserId)
    const summary = await getChallengeSummary(String(challenge._id), req.currentUserId)
    res.json({ viewerId: req.currentUserId, challenge: summary })
  } catch (err) {
    next(err)
  }
}

export async function deleteChallengeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteChallenge(req.params.challengeId, req.currentUserId)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
