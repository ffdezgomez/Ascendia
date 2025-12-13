import Challenge from '../models/challenge.js'
import HabitChallenge from '../models/habitChallenge.js'
import Log from '../models/log.js'
import Habit from '../models/habit.js'
import User from '../models/user.js'
import type { IChallenge, ChallengeStatus, ChallengeType } from '../types/challenge'
import type { IHabitChallenge, HabitChallengeSide, PendingHabitDraft } from '../types/habitChallenge'
import type { IHabit } from '../types/habit'
import { Types } from 'mongoose'

const HABIT_CATEGORIES = ['fitness', 'study', 'health', 'personal', 'work', 'creativity', 'spirituality', 'home'] as const
type HabitCategory = (typeof HABIT_CATEGORIES)[number]
const HABIT_COLORS = ['zinc', 'emerald', 'sky', 'amber', 'violet', 'rose', 'teal', 'indigo', 'lime', 'orange'] as const
type HabitColor = (typeof HABIT_COLORS)[number]

export interface HabitDraftInput {
  name: string
  type: string
  unit: string
  category?: HabitCategory
  emoji?: string
  color?: HabitColor
  description?: string
}

export interface CreateDisciplineInput {
  ownerHabitId?: string
  ownerHabitDraft?: HabitDraftInput
  challengerHabitId?: string
  challengerHabitDraft?: HabitDraftInput
  dailyGoal?: number
}

export interface CreateChallengeInput {
  type: ChallengeType
  opponentId?: string
  disciplines: CreateDisciplineInput[]
  startDate?: Date
  endDate?: Date | null
  title?: string
}

export type ChallengeResponseAction = 'accept' | 'reject' | 'modify'

export interface RespondChallengeInput {
  action: ChallengeResponseAction
  disciplines?: CreateDisciplineInput[]
  startDate?: Date
  endDate?: Date | null
}

export interface DisciplineProgressSide {
  userId: string
  habitId: string
  total: number
  dailyGoal: number
  targetTotal: number
  completionRatio: number
  todayTotal: number
  todayCompletionRatio: number
  habit?: HabitMeta
}

export interface DisciplineProgressSummary {
  id: string
  type: 'personal' | 'friend'
  owner: DisciplineProgressSide
  challenger?: DisciplineProgressSide
  winner: HabitChallengeSide | 'draw' | null
  durationDays: number
  ownerScore: number
  opponentScore: number
  draws: number
  pendingChallengerHabit?: PendingHabitMeta
}

export interface ChallengeSummary {
  id: string
  title: string
  type: ChallengeType
  status: ChallengeStatus
  ownerId: string
  opponentId: string | null
  startDate: Date
  endDate: Date | null
  awaitingUserId: string | null
  initiatorId: string
  disciplines: DisciplineProgressSummary[]
  ownerWins: number
  opponentWins: number
  draws: number
  overallWinner: 'owner' | 'opponent' | 'draw' | null
  durationDays: number
  owner?: ChallengeParticipant
  opponent?: ChallengeParticipant | null
  ownerRequestedFinish: boolean
  opponentRequestedFinish: boolean
}

export interface ChallengeParticipant {
  id: string
  username: string
  avatar: string
}

type HabitMeta = {
  id: string
  name: string
  type: string
  unit: string
  emoji: string
  color: string
  category?: IHabit['category']
}

type PendingHabitMeta = {
  name: string
  type: string
  unit: string
  emoji: string
  color: string
  category?: IHabit['category']
  description?: string
}

type HabitTemplate = IHabit & { _id: Types.ObjectId }

const MS_PER_DAY = 1000 * 60 * 60 * 24
const CHECK_TYPES = new Set(['boolean', 'checkbox', 'check'])

function indexHabitsById(habits: HabitTemplate[]): Map<string, HabitTemplate> {
  return habits.reduce((map, habit) => {
    map.set(String(habit._id), habit)
    return map
  }, new Map<string, HabitTemplate>())
}

function mapHabitMeta(habit: any): HabitMeta | undefined {
  if (!habit || typeof habit !== 'object') return undefined
  if (!('name' in habit) || !('_id' in habit)) return undefined
  const typed = habit as IHabit & { _id: Types.ObjectId }
  return {
    id: String(typed._id),
    name: typed.name,
    type: typed.type,
    unit: typed.unit,
    emoji: typed.emoji ?? '',
    color: typed.color ?? 'zinc',
    category: typed.category,
  }
}

function mapPendingHabitMeta(habit?: PendingHabitDraft | null): PendingHabitMeta | undefined {
  if (!habit) return undefined
  return {
    name: habit.name,
    type: habit.type,
    unit: habit.unit,
    emoji: habit.emoji ?? '',
    color: habit.color ?? 'zinc',
    category: habit.category,
    description: habit.description,
  }
}

function clampString(value: string, max: number): string {
  if (!value) return ''
  return value.slice(0, max)
}

function normalizeHabitDraftInput(draft?: HabitDraftInput | PendingHabitDraft | null): PendingHabitDraft | null {
  if (!draft) return null
  const name = clampString(String(draft.name ?? '').trim(), 80)
  const type = String(draft.type ?? '').trim()
  const unit = clampString(String(draft.unit ?? '').trim(), 40)
  if (!name || !type || !unit) {
    return null
  }
  const rawCategory = String(draft.category ?? '').trim()
  const category = HABIT_CATEGORIES.includes(rawCategory as HabitCategory) ? (rawCategory as HabitCategory) : 'personal'
  const rawColor = String(draft.color ?? '').trim()
  const color = HABIT_COLORS.includes(rawColor as HabitColor) ? (rawColor as HabitColor) : 'zinc'
  const emoji = clampString(String(draft.emoji ?? '').trim(), 4)
  const description = draft.description ? clampString(String(draft.description).trim(), 280) : undefined
  return {
    name,
    type,
    unit,
    category,
    color,
    emoji,
    description
  }
}

async function createHabitForUser(userId: Types.ObjectId, draft: HabitDraftInput | PendingHabitDraft): Promise<HabitTemplate> {
  const normalized = normalizeHabitDraftInput(draft)
  if (!normalized) {
    throw new Error('Los datos del hábito no son válidos')
  }

  const habit = await Habit.create({
    name: normalized.name,
    type: normalized.type,
    unit: normalized.unit,
    category: normalized.category ?? 'personal',
    emoji: normalized.emoji ?? '',
    color: normalized.color ?? 'zinc',
    description: normalized.description,
    user: userId,
  })

  await User.findByIdAndUpdate(userId, { $addToSet: { habits: habit._id } })

  return habit.toObject() as HabitTemplate
}

function isCheckHabitType(type?: string | null): boolean {
  if (!type) return false
  return CHECK_TYPES.has(String(type))
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function endOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

function dayKey(date: Date): number {
  return startOfDay(date).getTime()
}

type HabitLogsSummary = {
  total: number
  dailyTotals: Map<number, number>
}

type DisciplineDayScore = {
  owner: number
  opponent: number
  draws: number
}

async function getHabitLogsSummary(userId: string, habitId: string, start: Date, end: Date | null): Promise<HabitLogsSummary> {
  const startDate = startOfDay(start)
  const finalDate = end ? endOfDay(end) : endOfDay(new Date())

  const logs = await Log.find({
    user: userId,
    habit: habitId,
    date: {
      $gte: startDate,
      $lte: finalDate
    }
  }).lean()

  const dailyTotals = new Map<number, number>()
  let total = 0

  for (const log of logs) {
    const rawValue = typeof log.value === 'number' ? log.value : Number(log.value) || 0
    if (rawValue <= 0) continue

    total += rawValue
    const key = dayKey(log.date instanceof Date ? log.date : new Date(log.date))
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + rawValue)
  }

  return { total, dailyTotals }
}

function enumerateDayKeys(start: Date, end: Date): number[] {
  const keys: number[] = []
  let cursor = startOfDay(start)
  const limit = startOfDay(end)

  while (cursor <= limit) {
    keys.push(cursor.getTime())
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  }

  return keys
}

function resolveScoreboardEnd(challengeStart: Date, challengeEnd: Date | null): Date | null {
  const now = new Date()
  const todayStart = startOfDay(now)

  if (challengeEnd && challengeEnd < todayStart) {
    return challengeEnd
  }

  const previousDay = new Date(todayStart.getTime() - 1)
  if (previousDay < challengeStart) {
    return null
  }

  return previousDay
}

function calculateDisciplineScore(params: {
  ownerDailyTotals: Map<number, number>
  opponentDailyTotals?: Map<number, number>
  start: Date
  scoreboardEnd: Date | null
  dailyGoal: number
  challengeType: ChallengeType
}): DisciplineDayScore {
  const { ownerDailyTotals, opponentDailyTotals, start, scoreboardEnd, dailyGoal, challengeType } = params
  if (!scoreboardEnd) {
    return { owner: 0, opponent: 0, draws: 0 }
  }

  const dayKeys = enumerateDayKeys(start, scoreboardEnd)
  const result: DisciplineDayScore = { owner: 0, opponent: 0, draws: 0 }

  for (const key of dayKeys) {
    const ownerValue = ownerDailyTotals.get(key) ?? 0
    const ownerRatio = dailyGoal > 0 ? ownerValue / dailyGoal : 0

    if (challengeType === 'personal') {
      if (ownerRatio >= 1) {
        result.owner += 1
      }
      continue
    }

    const opponentValue = opponentDailyTotals?.get(key) ?? 0
    const opponentRatio = dailyGoal > 0 ? opponentValue / dailyGoal : 0
    const ratiosEqual = Math.abs(ownerRatio - opponentRatio) <= 0.01
    const anyProgress = ownerRatio > 0 || opponentRatio > 0

    if (ratiosEqual && anyProgress) {
      result.owner += 1
      result.opponent += 1
      result.draws += 1
    } else if (ownerRatio > opponentRatio) {
      result.owner += 1
    } else if (opponentRatio > ownerRatio) {
      result.opponent += 1
    }
  }

  return result
}

function calculateDurationDays(start: Date, end: Date | null): number {
  const startDate = new Date(start)
  startDate.setHours(0, 0, 0, 0)
  const endDate = end ? new Date(end) : new Date()
  endDate.setHours(0, 0, 0, 0)

  const diffMs = endDate.getTime() - startDate.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, days)
}

function calculateTargetTotal(dailyGoal: number, start: Date, end: Date | null): number {
  const duration = calculateDurationDays(start, end)
  return dailyGoal > 0 ? dailyGoal * duration : 0
}

function mapUserToParticipant(user: any | null | undefined): ChallengeParticipant | undefined {
  if (!user) return undefined
  const avatar = user.profile && typeof user.profile === 'object' && 'avatar' in user.profile
    ? String(user.profile.avatar ?? '')
    : ''

  return {
    id: String(user._id),
    username: user.username ?? 'Usuario',
    avatar
  }
}

export async function listUserChallenges (userId: string, status?: ChallengeStatus): Promise<IChallenge[]> {
  const filter: any = {
    $or: [
      { owner: userId },
      { opponent: userId },
    ],
  }

  if (status) {
    filter.status = status
  }

  const docs = await Challenge.find(filter)
    .populate({
      path: 'owner',
      select: 'username profile',
      populate: {
        path: 'profile',
        select: 'avatar'
      }
    })
    .populate({
      path: 'opponent',
      select: 'username profile',
      populate: {
        path: 'profile',
        select: 'avatar'
      }
    })
    .sort({ createdAt: -1 })
    .lean()
  return docs as unknown as IChallenge[]
}

export async function createChallenge (ownerId: string, input: CreateChallengeInput): Promise<IChallenge> {
  if (input.type !== 'personal' && input.type !== 'friend') {
    throw new Error('Tipo de reto no soportado')
  }
  const ownerObjectId = new Types.ObjectId(ownerId)

  let opponentObjectId: Types.ObjectId | null = null
  if (input.type === 'friend') {
    if (!input.opponentId) {
      throw new Error('OpponentId is required for friend challenges')
    }
    opponentObjectId = new Types.ObjectId(input.opponentId)
  }

  if (!input.disciplines.length) {
    throw new Error('At least one discipline is required')
  }

  const startDate = input.startDate ?? new Date()
  const endDate = input.endDate ?? null
  if (endDate && endDate < startDate) {
    throw new Error('La fecha de fin no puede ser anterior a la de inicio')
  }
  const title = input.title?.trim().slice(0, 120) ?? ''

  // Validar que los hábitos existen y pertenecen a los usuarios correctos
  const ownerHabitIds = input.disciplines
    .map(d => d.ownerHabitId)
    .filter((id): id is string => Boolean(id))
  const ownerHabits = ownerHabitIds.length
    ? await Habit.find({ _id: { $in: ownerHabitIds }, user: ownerObjectId }).lean<HabitTemplate[]>()
    : []
  if (ownerHabits.length !== ownerHabitIds.length) {
    throw new Error('Some owner habits do not exist or do not belong to the owner')
  }

  const ownerHabitsMap = indexHabitsById(ownerHabits)

  let challengerHabitsMap: Map<string, HabitTemplate> | undefined

  if (input.type === 'friend' && opponentObjectId) {
    const challengerHabitIds = input.disciplines
      .map(d => d.challengerHabitId)
      .filter((id): id is string => Boolean(id))

    const challengerHabits = challengerHabitIds.length
      ? await Habit.find({ _id: { $in: challengerHabitIds }, user: opponentObjectId }).lean<HabitTemplate[]>()
      : []
    if (challengerHabits.length !== challengerHabitIds.length) {
      throw new Error('Some challenger habits do not exist or do not belong to the opponent')
    }

    challengerHabitsMap = indexHabitsById(challengerHabits)
  }

  const habitChallenges: IHabitChallenge[] = []

  for (const discipline of input.disciplines) {
    let ownerHabitTemplate: HabitTemplate | undefined
    if (discipline.ownerHabitId) {
      ownerHabitTemplate = ownerHabitsMap.get(discipline.ownerHabitId)
    }
    if (!ownerHabitTemplate && discipline.ownerHabitDraft) {
      ownerHabitTemplate = await createHabitForUser(ownerObjectId, discipline.ownerHabitDraft)
    }
    if (!ownerHabitTemplate) {
      throw new Error('El hábito del owner no es válido')
    }

    const ownerIsCheck = isCheckHabitType(ownerHabitTemplate.type)

    const requestedGoal = discipline.dailyGoal ?? null
    const normalizedGoal = ownerIsCheck ? 1 : Number(requestedGoal)
    if (!ownerIsCheck) {
      if (!Number.isFinite(normalizedGoal) || normalizedGoal <= 0) {
        throw new Error('Cada disciplina debe incluir un objetivo diario válido')
      }
    }

    let challengerHabitId: Types.ObjectId | null = null
    let pendingChallengerHabit: PendingHabitDraft | null = null
    if (input.type === 'friend') {
      if (discipline.challengerHabitId) {
        const challengerHabitTemplate = challengerHabitsMap?.get(discipline.challengerHabitId)
        if (!challengerHabitTemplate || !opponentObjectId) {
          throw new Error('El hábito del challenger no es válido')
        }
        if (isCheckHabitType(challengerHabitTemplate.type) !== ownerIsCheck) {
          throw new Error('Ambos hábitos deben compartir el mismo tipo de seguimiento')
        }
        if (challengerHabitTemplate.type !== ownerHabitTemplate.type || challengerHabitTemplate.unit !== ownerHabitTemplate.unit) {
          throw new Error('Ambos hábitos deben compartir tipo y unidad para poder competir')
        }
        challengerHabitId = challengerHabitTemplate._id
      } else if (discipline.challengerHabitDraft) {
        const normalizedDraft = normalizeHabitDraftInput(discipline.challengerHabitDraft)
        if (!normalizedDraft) {
          throw new Error('Los datos del nuevo hábito del amigo no son válidos')
        }
        if (normalizedDraft.type !== ownerHabitTemplate.type || normalizedDraft.unit !== ownerHabitTemplate.unit) {
          throw new Error('Ambos hábitos deben compartir tipo y unidad para poder competir')
        }
        if (isCheckHabitType(normalizedDraft.type) !== ownerIsCheck) {
          throw new Error('Ambos hábitos deben compartir el mismo tipo de seguimiento')
        }
        pendingChallengerHabit = normalizedDraft
      } else {
        throw new Error('Cada disciplina con amigos debe incluir un hábito del rival')
      }
    }

    const habitChallenge = await HabitChallenge.create({
      owner: ownerObjectId,
      challenger: input.type === 'friend' ? opponentObjectId : null,
      ownerHabit: ownerHabitTemplate._id,
      challengerHabit: challengerHabitId,
      pendingChallengerHabit: pendingChallengerHabit ?? undefined,
      dailyGoal: normalizedGoal,
      type: input.type,
    })

    habitChallenges.push(habitChallenge)
  }

  const status: ChallengeStatus = input.type === 'friend' ? 'pending' : 'active'

  const challenge = await Challenge.create({
    title,
    owner: ownerObjectId,
    opponent: opponentObjectId,
    type: input.type,
    status,
    initiator: ownerObjectId,
    awaitingUser: input.type === 'friend' ? opponentObjectId : null,
    disciplines: habitChallenges.map(d => d._id),
    startDate,
    endDate,
    ownerWantsToFinish: false,
    opponentWantsToFinish: false,
  })

  return challenge
}

export async function respondToChallenge (challengeId: string, userId: string, input: RespondChallengeInput): Promise<IChallenge> {
  const challenge = await Challenge.findById(challengeId)

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  if (challenge.type !== 'friend') {
    throw new Error('Solo los retos con amigos admiten respuestas')
  }

  const ownerId = String(challenge.owner)
  const opponentId = challenge.opponent ? String(challenge.opponent) : null

  if (!opponentId) {
    throw new Error('Reto inválido: falta opponent')
  }

  if (String(challenge.status) !== 'pending') {
    throw new Error('Solo se pueden responder retos pendientes')
  }

  if (!challenge.awaitingUser || String(challenge.awaitingUser) !== userId) {
    throw new Error('No estás autorizado para responder este reto')
  }

  if (input.action === 'accept') {
    if (!opponentId) {
      throw new Error('Reto inválido: falta opponent')
    }

    const opponentObjectId = new Types.ObjectId(opponentId)
    const habitChallenges = await HabitChallenge.find({ _id: { $in: challenge.disciplines } })
    for (const habitChallenge of habitChallenges) {
      if (!habitChallenge.challengerHabit && habitChallenge.pendingChallengerHabit) {
        const newHabit = await createHabitForUser(opponentObjectId, habitChallenge.pendingChallengerHabit)
        habitChallenge.challengerHabit = newHabit._id as Types.ObjectId
        habitChallenge.pendingChallengerHabit = null
        await habitChallenge.save()
      }
    }

    challenge.status = 'active'
    challenge.awaitingUser = null
    await challenge.save()
    return challenge
  }

  if (input.action === 'reject') {
    challenge.status = 'rejected'
    challenge.awaitingUser = null
    await challenge.save()
    return challenge
  }

  if (input.action === 'modify') {
    if (!input.disciplines || input.disciplines.length === 0) {
      throw new Error('Debes proporcionar disciplinas para modificar el reto')
    }

    const newStart = input.startDate ?? challenge.startDate
    const newEnd = input.endDate ?? challenge.endDate

    if (newStart && newEnd && newEnd < newStart) {
      throw new Error('endDate no puede ser anterior a startDate')
    }

    const ownerObjectId = challenge.owner as Types.ObjectId
    const opponentObjectId = challenge.opponent as Types.ObjectId

    const ownerHabitIds = input.disciplines.map(d => d.ownerHabitId)
    const ownerHabits = await Habit.find({ _id: { $in: ownerHabitIds }, user: ownerObjectId }).lean<HabitTemplate[]>()
    if (ownerHabits.length !== ownerHabitIds.length) {
      throw new Error('Algunos hábitos del owner no son válidos')
    }

    const ownerHabitsMap = indexHabitsById(ownerHabits)

    const challengerHabitIds = input.disciplines
      .map(d => d.challengerHabitId)
      .filter((id): id is string => Boolean(id))

    if (challengerHabitIds.length !== input.disciplines.length) {
      throw new Error('Todas las disciplinas deben incluir challengerHabitId')
    }

    const challengerHabits = await Habit.find({ _id: { $in: challengerHabitIds }, user: opponentObjectId }).lean<HabitTemplate[]>()
    if (challengerHabits.length !== challengerHabitIds.length) {
      throw new Error('Algunos hábitos del challenger no son válidos')
    }

    const challengerHabitsMap = indexHabitsById(challengerHabits)

    await HabitChallenge.deleteMany({ _id: { $in: challenge.disciplines } })

    const newDisciplineIds: Types.ObjectId[] = []

    for (const discipline of input.disciplines) {
      const ownerHabitTemplate = discipline.ownerHabitId ? ownerHabitsMap.get(discipline.ownerHabitId) : undefined
      const challengerHabitId = discipline.challengerHabitId
      const challengerHabitTemplate = challengerHabitId ? challengerHabitsMap.get(challengerHabitId) : undefined

      if (!ownerHabitTemplate || !challengerHabitTemplate) {
        throw new Error('Los hábitos seleccionados ya no son válidos')
      }

      if (challengerHabitTemplate.type !== ownerHabitTemplate.type || challengerHabitTemplate.unit !== ownerHabitTemplate.unit) {
        throw new Error('Ambos hábitos deben compartir tipo y unidad para poder competir')
      }

      const ownerIsCheck = isCheckHabitType(ownerHabitTemplate.type)

      const requestedGoal = discipline.dailyGoal ?? null
      const normalizedGoal = ownerIsCheck ? 1 : Number(requestedGoal)
      if (!ownerIsCheck) {
        if (!Number.isFinite(normalizedGoal) || normalizedGoal <= 0) {
          throw new Error('Cada disciplina debe incluir un objetivo diario válido')
        }
      }

      const habitChallenge = await HabitChallenge.create({
        owner: ownerObjectId,
        challenger: opponentObjectId,
        ownerHabit: ownerHabitTemplate._id,
        challengerHabit: challengerHabitTemplate._id,
        dailyGoal: normalizedGoal,
        type: 'friend',
      })

      newDisciplineIds.push(habitChallenge._id as Types.ObjectId)
    }

    challenge.disciplines = newDisciplineIds
    challenge.startDate = newStart
    challenge.endDate = newEnd ?? null
    challenge.initiator = new Types.ObjectId(userId)
    challenge.awaitingUser = new Types.ObjectId(userId === ownerId ? opponentId : ownerId)
    challenge.status = 'pending'

    await challenge.save()
    return challenge
  }

  throw new Error('Acción no soportada')
}

export async function requestFinishChallenge (challengeId: string, userId: string): Promise<IChallenge> {
  const challenge = await Challenge.findById(challengeId)

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  const ownerId = String(challenge.owner)
  const opponentId = challenge.opponent ? String(challenge.opponent) : null

  if (userId !== ownerId && (!opponentId || userId !== opponentId)) {
    throw new Error('No estás autorizado para cerrar este reto')
  }

  if (challenge.status !== 'active' && challenge.status !== 'pending_finish') {
    throw new Error('Solo se pueden cerrar retos activos')
  }

  if (userId === ownerId) {
    challenge.ownerWantsToFinish = true
  } else if (opponentId && userId === opponentId) {
    challenge.opponentWantsToFinish = true
  }

  const now = new Date()

  if (challenge.ownerWantsToFinish && (!opponentId || challenge.opponentWantsToFinish)) {
    challenge.status = 'finished'
    if (!challenge.endDate || challenge.endDate > now) {
      challenge.endDate = now
    }
  } else {
    challenge.status = 'pending_finish'
  }

  await challenge.save()
  return challenge
}

export async function declineFinishChallenge (challengeId: string, userId: string): Promise<IChallenge> {
  const challenge = await Challenge.findById(challengeId)

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  const ownerId = String(challenge.owner)
  const opponentId = challenge.opponent ? String(challenge.opponent) : null

  if (userId !== ownerId && (!opponentId || userId !== opponentId)) {
    throw new Error('No estás autorizado para gestionar este reto')
  }

  if (challenge.status !== 'pending_finish') {
    throw new Error('No hay una solicitud de cierre pendiente')
  }

  const viewerFlag = userId === ownerId ? 'ownerWantsToFinish' : 'opponentWantsToFinish'
  const rivalFlag = viewerFlag === 'ownerWantsToFinish' ? 'opponentWantsToFinish' : 'ownerWantsToFinish'

  if (!challenge[rivalFlag as 'ownerWantsToFinish' | 'opponentWantsToFinish']) {
    throw new Error('No hay una solicitud de cierre que puedas rechazar')
  }

  challenge.ownerWantsToFinish = false
  challenge.opponentWantsToFinish = false
  challenge.status = 'active'

  await challenge.save()
  return challenge
}

export async function deleteChallenge (challengeId: string, userId: string): Promise<void> {
  const challenge = await Challenge.findById(challengeId)

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  const ownerId = String(challenge.owner)
  const opponentId = challenge.opponent ? String(challenge.opponent) : null

  const isOwner = userId === ownerId
  const isOpponent = opponentId ? userId === opponentId : false

  if (!isOwner && !isOpponent) {
    throw new Error('No estás autorizado para eliminar este reto')
  }

  await HabitChallenge.deleteMany({ _id: { $in: challenge.disciplines } })
  await Challenge.deleteOne({ _id: challenge._id })
}

export async function getChallengeSummary (challengeId: string, currentUserId: string): Promise<ChallengeSummary> {
  const challenge = await Challenge.findById(challengeId)
    .populate([
      {
        path: 'disciplines',
        populate: [
          { path: 'ownerHabit', model: 'Habit' },
          { path: 'challengerHabit', model: 'Habit' },
        ],
      },
      {
        path: 'owner',
        select: 'username profile',
        populate: { path: 'profile', select: 'avatar' }
      },
      {
        path: 'opponent',
        select: 'username profile',
        populate: { path: 'profile', select: 'avatar' }
      }
    ])
    .lean<IChallenge & {
      disciplines: Array<IHabitChallenge & { ownerHabit?: IHabit; challengerHabit?: IHabit }>
      owner: any
      opponent?: any
    }>()

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  const ownerId = String(challenge.owner?._id ?? challenge.owner)
  const opponentId = challenge.opponent ? String(challenge.opponent?._id ?? challenge.opponent) : null

  const isParticipant = currentUserId === ownerId || (opponentId && currentUserId === opponentId)
  if (!isParticipant) {
    throw new Error('Not allowed to view this challenge')
  }

  const start = challenge.startDate
  const end = challenge.endDate ?? null
  const durationDays = calculateDurationDays(start, end)

  const now = new Date()
  const todayStart = startOfDay(now)
  const activeRangeEnd = challenge.endDate && challenge.endDate < now ? challenge.endDate : now
  const progressDay = activeRangeEnd < todayStart ? activeRangeEnd : todayStart
  const progressDayKey = dayKey(progressDay)
  const scoreboardEnd = resolveScoreboardEnd(start, challenge.endDate ?? null)

  const ownerParticipant = mapUserToParticipant(challenge.owner)
  const opponentParticipant = mapUserToParticipant(challenge.opponent)

  let ownerWins = 0
  let opponentWins = 0
  let draws = 0
  const disciplinesSummaries: DisciplineProgressSummary[] = []

  for (const discipline of challenge.disciplines) {
    const ownerHabitId = String(discipline.ownerHabit?._id ?? discipline.ownerHabit)
    const ownerLogs = await getHabitLogsSummary(ownerId, ownerHabitId, start, activeRangeEnd)
    const ownerTotal = ownerLogs.total
    const ownerHabitMeta = mapHabitMeta(discipline.ownerHabit)
    const targetTotal = calculateTargetTotal(discipline.dailyGoal, start, end)
    const ownerTodayTotal = ownerLogs.dailyTotals.get(progressDayKey) ?? 0

    const ownerSide: DisciplineProgressSide = {
      userId: ownerId,
      habitId: ownerHabitId,
      total: ownerTotal,
      dailyGoal: discipline.dailyGoal,
      targetTotal,
      completionRatio: targetTotal > 0 ? ownerTotal / targetTotal : 0,
      todayTotal: ownerTodayTotal,
      todayCompletionRatio: discipline.dailyGoal > 0 ? ownerTodayTotal / discipline.dailyGoal : 0,
      habit: ownerHabitMeta,
    }

    let challengerSide: DisciplineProgressSide | undefined
    let challengerLogs: HabitLogsSummary | undefined
    if (discipline.type === 'friend' && challenge.opponent && discipline.challengerHabit) {
      const challengerId = String(challenge.opponent?._id ?? challenge.opponent)
      const challengerHabitId = String(discipline.challengerHabit?._id ?? discipline.challengerHabit)
      challengerLogs = await getHabitLogsSummary(challengerId, challengerHabitId, start, activeRangeEnd)
      const challengerTotal = challengerLogs.total
      const challengerHabitMeta = mapHabitMeta(discipline.challengerHabit)
      const challengerTodayTotal = challengerLogs.dailyTotals.get(progressDayKey) ?? 0

      challengerSide = {
        userId: challengerId,
        habitId: challengerHabitId,
        total: challengerTotal,
        dailyGoal: discipline.dailyGoal,
        targetTotal,
        completionRatio: targetTotal > 0 ? challengerTotal / targetTotal : 0,
        todayTotal: challengerTodayTotal,
        todayCompletionRatio: discipline.dailyGoal > 0 ? challengerTodayTotal / discipline.dailyGoal : 0,
        habit: challengerHabitMeta,
      }
    }

    let winner: HabitChallengeSide | 'draw' | null = null

    if (discipline.type === 'personal') {
      winner = ownerSide.total >= ownerSide.targetTotal ? 'owner' : null
    } else if (challengerSide) {
      const ownerRatio = ownerSide.completionRatio
      const challengerRatio = challengerSide.completionRatio

      if (ownerRatio > challengerRatio) {
        winner = 'owner'
      } else if (challengerRatio > ownerRatio) {
        winner = 'challenger'
      } else if (ownerSide.total !== challengerSide.total) {
        winner = ownerSide.total > challengerSide.total ? 'owner' : 'challenger'
      } else {
        winner = 'draw'
      }
    }

    const disciplineScore = calculateDisciplineScore({
      ownerDailyTotals: ownerLogs.dailyTotals,
      opponentDailyTotals: challengerLogs?.dailyTotals,
      start,
      scoreboardEnd,
      dailyGoal: discipline.dailyGoal,
      challengeType: discipline.type
    })

    ownerWins += disciplineScore.owner
    opponentWins += disciplineScore.opponent
    draws += disciplineScore.draws

    disciplinesSummaries.push({
      id: String(discipline._id),
      type: discipline.type,
      owner: ownerSide,
      challenger: challengerSide,
      winner,
      durationDays,
      ownerScore: disciplineScore.owner,
      opponentScore: discipline.type === 'friend' ? disciplineScore.opponent : 0,
      draws: disciplineScore.draws,
      pendingChallengerHabit: mapPendingHabitMeta(discipline.pendingChallengerHabit)
    })
  }

  let overallWinner: 'owner' | 'opponent' | 'draw' | null = null
  if (ownerWins > opponentWins) {
    overallWinner = 'owner'
  } else if (opponentWins > ownerWins) {
    overallWinner = 'opponent'
  } else if (ownerWins === opponentWins && ownerWins + opponentWins + draws > 0) {
    overallWinner = 'draw'
  }

  return {
    id: String(challenge._id),
    title: challenge.title ?? '',
    type: challenge.type,
    status: challenge.status,
    ownerId,
    opponentId,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    awaitingUserId: challenge.awaitingUser ? String(challenge.awaitingUser) : null,
    initiatorId: challenge.initiator ? String(challenge.initiator) : ownerId,
    disciplines: disciplinesSummaries,
    ownerWins,
    opponentWins,
    draws,
    overallWinner,
    durationDays,
    owner: ownerParticipant,
    opponent: opponentParticipant ?? null,
    ownerRequestedFinish: Boolean(challenge.ownerWantsToFinish),
    opponentRequestedFinish: Boolean(challenge.opponentWantsToFinish)
  }
}
