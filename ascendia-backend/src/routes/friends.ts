import { Router } from 'express'
import User from '../models/user.js'
import FriendRequest from '../models/friendRequest.js'
import Profile from '../models/profile.js'
import Habit from '../models/habit.js'
import HabitComparison from '../models/habitComparison.js'
import { buildDashboardSummary, buildHabitSummaries } from '../services/dashboardSummary.js'
import type { HabitSummary } from '../services/dashboardSummary.js'
import { createNotification } from '../services/notifications'

const r = Router()

type PublicUser = {
  id: string
  username: string
  avatar: string
}

function requireAuth(req: any, res: any, next: any) {
  const sessionUser = req.session?.user
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  req.currentUserId = sessionUser.userId
  next()
}

r.use(requireAuth)

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function toPublicUsers(rawUsers: Array<any | null | undefined>): Promise<Array<PublicUser | null>> {
  const missingIds = rawUsers
    .filter((user): user is any => Boolean(user) && (!user.profile || typeof user.profile !== 'object'))
    .map((user) => user._id)

  let profileMap = new Map<string, string>()
  if (missingIds.length > 0) {
    const profiles = await Profile.find({ user: { $in: missingIds } })
      .select('user avatar')
      .lean()
    profileMap = new Map(profiles.map((profile: any) => [String(profile.user), profile.avatar ?? '']))
  }

  return rawUsers.map((user) => {
    if (!user) return null
    let avatar = ''
    if (user.profile && typeof user.profile === 'object' && 'avatar' in user.profile) {
      avatar = (user.profile.avatar as string) || ''
    } else {
      avatar = profileMap.get(String(user._id)) || ''
    }
    return {
      id: String(user._id),
      username: user.username,
      avatar
    }
  })
}

function areFriends(user: { friends?: any[] }, candidateId: string) {
  return (user.friends || []).some((friendId: any) => String(friendId) === String(candidateId))
}

type ComparisonPayload = {
  id: string
  unit: string
  type: HabitSummary['type']
  ownerHabit: HabitSummary
  friendHabit: HabitSummary
  deltaThisMonth: number
  createdAt: string
}

async function buildComparisonPayloads(options: {
  ownerId: string
  friendId: string
  comparisons: Array<any>
  friendHabitMap?: Map<string, HabitSummary>
}): Promise<ComparisonPayload[]> {
  const { ownerId, friendId, comparisons, friendHabitMap } = options
  if (comparisons.length === 0) {
    return []
  }

  const ownerHabitIds = Array.from(new Set(comparisons.map((comparison) => String(comparison.ownerHabit))))
  const ownerSummaries = await buildHabitSummaries(ownerId, ownerHabitIds)
  const ownerSummaryMap = new Map(ownerSummaries.map((summary) => [summary.id, summary]))

  let finalFriendHabitMap = friendHabitMap
  if (!finalFriendHabitMap) {
    const friendHabitIds = Array.from(new Set(comparisons.map((comparison) => String(comparison.friendHabit))))
    const friendSummaries = await buildHabitSummaries(friendId, friendHabitIds)
    finalFriendHabitMap = new Map(friendSummaries.map((summary) => [summary.id, summary]))
  }

  return comparisons
    .map((comparison: any) => {
      const friendHabit = finalFriendHabitMap?.get(String(comparison.friendHabit))
      const ownerHabit = ownerSummaryMap.get(String(comparison.ownerHabit))

      if (!friendHabit || !ownerHabit) {
        return null
      }

      const createdAtValue = comparison.createdAt instanceof Date
        ? comparison.createdAt
        : (comparison.createdAt ? new Date(comparison.createdAt) : new Date())

      return {
        id: String(comparison._id),
        unit: friendHabit.unit,
        type: friendHabit.type,
        ownerHabit,
        friendHabit,
        deltaThisMonth: ownerHabit.totalThisMonth - friendHabit.totalThisMonth,
        createdAt: createdAtValue.toISOString()
      }
    })
    .filter((comparison): comparison is ComparisonPayload => Boolean(comparison))
}

r.get('/friends/overview', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const user = await User.findById(userId)
      .populate({
        path: 'friends',
        select: 'username profile',
        populate: { path: 'profile', select: 'avatar' }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const [incomingRequests, outgoingRequests] = await Promise.all([
      FriendRequest.find({ to: userId })
        .populate({
          path: 'from',
          select: 'username profile',
          populate: { path: 'profile', select: 'avatar' }
        })
        .lean(),
      FriendRequest.find({ from: userId })
        .populate({
          path: 'to',
          select: 'username profile',
          populate: { path: 'profile', select: 'avatar' }
        })
        .lean()
    ])

    const [friendsPublic, incomingUsers, outgoingUsers] = await Promise.all([
      toPublicUsers(user.friends ?? []),
      toPublicUsers(incomingRequests.map((req: any) => req.from)),
      toPublicUsers(outgoingRequests.map((req: any) => req.to))
    ])

    res.json({
      friends: friendsPublic.filter(Boolean) as PublicUser[],
      incoming: incomingRequests.map((req: any, index: number) => ({
        id: String(req._id),
        user: incomingUsers[index]
      })),
      outgoing: outgoingRequests.map((req: any, index: number) => ({
        id: String(req._id),
        user: outgoingUsers[index]
      }))
    })
  } catch (err) {
    next(err)
  }
})

r.get('/friends/:friendId/dashboard', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const { friendId } = req.params

    const [currentUser, friendUser] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findById(friendId).select('_id').lean()
    ])

    if (!currentUser || !friendUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!areFriends(currentUser, friendId)) {
      return res.status(403).json({ error: 'No puedes ver el dashboard de este usuario' })
    }

    const [summary, comparisonDocs] = await Promise.all([
      buildDashboardSummary(friendId),
      HabitComparison.find({ owner: userId, friend: friendId }).lean()
    ])

    const friendHabitMap = new Map(summary.habits.map((habit) => [habit.id, habit]))
    const comparisonPayloads = await buildComparisonPayloads({
      ownerId: userId,
      friendId,
      comparisons: comparisonDocs,
      friendHabitMap
    })

    res.json({
      ...summary,
      comparisons: comparisonPayloads
    })
  } catch (err) {
    next(err)
  }
})

r.get('/friends/:friendId/comparisons/candidates', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const { friendId } = req.params
    const friendHabitId = String(req.query?.friendHabitId || '').trim()

    if (!friendHabitId) {
      return res.status(400).json({ error: 'friendHabitId es requerido' })
    }

    const [currentUser, friendUser, friendHabit] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findById(friendId).select('_id').lean(),
      Habit.findOne({ _id: friendHabitId, user: friendId }).select('type unit').lean()
    ])

    if (!currentUser || !friendUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!areFriends(currentUser, friendId)) {
      return res.status(403).json({ error: 'No puedes comparar hábitos con este usuario' })
    }

    if (!friendHabit) {
      return res.status(404).json({ error: 'Este hábito ya no existe' })
    }

    const matchingHabits = await Habit.find({
      user: userId,
      type: friendHabit.type,
      unit: friendHabit.unit
    }).select('_id').lean()

    const habitIds = matchingHabits.map((habit: any) => String(habit._id))
    const summaries = habitIds.length > 0 ? await buildHabitSummaries(userId, habitIds) : []

    res.json({
      habits: summaries,
      unit: friendHabit.unit,
      type: friendHabit.type
    })
  } catch (err) {
    next(err)
  }
})

r.post('/friends/:friendId/comparisons', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const { friendId } = req.params
    const friendHabitId = String(req.body?.friendHabitId || '').trim()
    const ownerHabitId = String(req.body?.ownerHabitId || '').trim()

    if (!friendHabitId || !ownerHabitId) {
      return res.status(400).json({ error: 'Debes seleccionar ambos hábitos' })
    }

    const [currentUser, friendUser, friendHabit, ownerHabit] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findById(friendId).select('_id').lean(),
      Habit.findOne({ _id: friendHabitId, user: friendId }).lean(),
      Habit.findOne({ _id: ownerHabitId, user: userId }).lean()
    ])

    if (!currentUser || !friendUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!areFriends(currentUser, friendId)) {
      return res.status(403).json({ error: 'No puedes comparar hábitos con este usuario' })
    }

    if (!friendHabit || !ownerHabit) {
      return res.status(404).json({ error: 'Alguno de los hábitos ya no existe' })
    }

    if (friendHabit.unit !== ownerHabit.unit || friendHabit.type !== ownerHabit.type) {
      return res.status(400).json({ error: 'Ambos hábitos deben compartir unidad y tipo' })
    }

    const existing = await HabitComparison.findOne({
      owner: userId,
      friend: friendId,
      ownerHabit: ownerHabitId,
      friendHabit: friendHabitId
    }).lean()

    if (existing) {
      return res.status(409).json({ error: 'Ya existe una comparación con estos hábitos' })
    }

    const comparison = await HabitComparison.create({
      owner: userId,
      friend: friendId,
      ownerHabit: ownerHabitId,
      friendHabit: friendHabitId
    })

    const [payload] = await buildComparisonPayloads({
      ownerId: userId,
      friendId,
      comparisons: [comparison]
    })

    res.status(201).json({ comparison: payload })
  } catch (err) {
    next(err)
  }
})

r.delete('/friends/:friendId/comparisons/:comparisonId', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const { friendId, comparisonId } = req.params

    const comparison = await HabitComparison.findById(comparisonId).lean()
    if (!comparison) {
      return res.status(404).json({ error: 'Comparación no encontrada' })
    }

    if (String(comparison.owner) !== String(userId) || String(comparison.friend) !== String(friendId)) {
      return res.status(403).json({ error: 'No puedes modificar esta comparación' })
    }

    await HabitComparison.deleteOne({ _id: comparisonId })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

r.get('/friends/search', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const username = String(req.query?.username || '').trim()

    if (!username) {
      return res.status(400).json({ error: 'Username es requerido' })
    }

    const usernameFilter = new RegExp(`^${escapeRegex(username)}$`, 'i')

    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findOne({ username: usernameFilter })
        .populate({ path: 'profile', select: 'avatar' })
        .lean()
    ])

    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'No existe un usuario con ese username' })
    }

    if (String(targetUser._id) === userId) {
      return res.status(400).json({ error: 'No puedes buscarte a ti mismo' })
    }

    const alreadyFriends = areFriends(currentUser, String(targetUser._id))

    const pending = await FriendRequest.findOne({
      $or: [
        { from: userId, to: targetUser._id },
        { from: targetUser._id, to: userId }
      ]
    }).lean()

    let pendingDirection: 'incoming' | 'outgoing' | null = null
    if (pending) {
      pendingDirection = String(pending.from) === userId ? 'outgoing' : 'incoming'
    }

    const [targetPublic] = await toPublicUsers([targetUser])

    res.json({
      user: targetPublic,
      alreadyFriends,
      pendingDirection
    })
  } catch (err) {
    next(err)
  }
})

r.post('/friends/requests', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const username = String(req.body?.username || '').trim()

    if (!username) {
      return res.status(400).json({ error: 'Username es requerido' })
    }

    const usernameFilter = new RegExp(`^${escapeRegex(username)}$`, 'i')

    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findOne({ username: usernameFilter })
        .populate({ path: 'profile', select: 'avatar' })
        .lean()
    ])

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (String(targetUser._id) === userId) {
      return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' })
    }

    const alreadyFriends = (currentUser.friends || []).some((friendId: any) => String(friendId) === String(targetUser._id))
    if (alreadyFriends) {
      return res.status(409).json({ error: 'Ya son amigos' })
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: userId, to: targetUser._id },
        { from: targetUser._id, to: userId }
      ]
    }).lean()

    if (existingRequest) {
      return res.status(409).json({ error: 'Ya existe una solicitud pendiente entre estos usuarios' })
    }

    const request = await FriendRequest.create({ from: userId, to: targetUser._id })

    const requesterName = req.session?.user?.username ?? 'Un usuario'
    await createNotification({
      userId: String(targetUser._id),
      type: 'friend_request_received',
      title: 'Nueva solicitud de amistad',
      message: `${requesterName} quiere conectar contigo.`,
      metadata: {
        requestId: String(request._id),
        fromUserId: userId
      }
    })

    const [targetPublic] = await toPublicUsers([targetUser])

    res.status(201).json({
      id: String(request._id),
      user: targetPublic
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return res.status(409).json({ error: 'Ya enviaste una solicitud a este usuario' })
    }
    next(err)
  }
})

r.post('/friends/requests/:id/accept', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const request = await FriendRequest.findById(req.params.id)

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    if (String(request.to) !== userId) {
      return res.status(403).json({ error: 'No puedes aceptar esta solicitud' })
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { friends: request.from } }),
      User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } })
    ])

    await request.deleteOne()

    const accepterName = req.session?.user?.username ?? 'Tu amigo'
    await createNotification({
      userId: String(request.from),
      type: 'friend_request_accepted',
      title: 'Solicitud aceptada',
      message: `${accepterName} aceptó tu solicitud de amistad.`,
      metadata: {
        friendId: userId
      }
    })

    const friend = await User.findById(request.from)
      .populate({ path: 'profile', select: 'avatar' })
      .lean()

    const [friendPublic] = await toPublicUsers([friend])

    res.json({ friend: friendPublic })
  } catch (err) {
    next(err)
  }
})

r.post('/friends/requests/:id/decline', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const request = await FriendRequest.findById(req.params.id)

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    if (String(request.to) !== userId && String(request.from) !== userId) {
      return res.status(403).json({ error: 'No puedes modificar esta solicitud' })
    }

    await request.deleteOne()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

r.delete('/friends/:friendId', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId
    const { friendId } = req.params

    const [currentUser, friendUser] = await Promise.all([
      User.findById(userId).select('friends').lean(),
      User.findById(friendId).select('friends').lean()
    ])

    if (!currentUser || !friendUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!areFriends(currentUser, friendId)) {
      return res.status(400).json({ error: 'No son amigos' })
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
      FriendRequest.deleteMany({
        $or: [
          { from: userId, to: friendId },
          { from: friendId, to: userId }
        ]
      })
    ])

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default r
