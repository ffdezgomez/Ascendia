export type ChallengeType = 'personal' | 'friend'

export type ChallengeStatus =
  | 'pending'
  | 'active'
  | 'pending_finish'
  | 'finished'
  | 'rejected'
  | 'cancelled'

export type ChallengeParticipant = {
  id: string
  username: string
  avatar: string
}

export type ChallengeHabitMeta = {
  id: string
  name: string
  type: string
  unit: string
  emoji: string
  color: string
  category?: string
}

export type ChallengePendingHabitMeta = {
  name: string
  type: string
  unit: string
  emoji?: string
  color?: string
  category?: string
  description?: string
}

export type ChallengeDisciplineSide = {
  userId: string
  habitId: string
  total: number
  dailyGoal: number
  targetTotal: number
  completionRatio: number
  todayTotal: number
  todayCompletionRatio: number
  habit?: ChallengeHabitMeta
}

export type ChallengeDiscipline = {
  id: string
  type: ChallengeType
  owner: ChallengeDisciplineSide
  challenger?: ChallengeDisciplineSide
  winner: 'owner' | 'challenger' | 'draw' | null
  durationDays: number
  ownerScore: number
  opponentScore: number
  draws: number
  pendingChallengerHabit?: ChallengePendingHabitMeta
}

export type ChallengeSummary = {
  id: string
  title: string
  type: ChallengeType
  status: ChallengeStatus
  ownerId: string
  opponentId: string | null
  startDate: string
  endDate: string | null
  awaitingUserId: string | null
  initiatorId: string
  disciplines: ChallengeDiscipline[]
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

export type ChallengeListResponse = {
  viewerId: string
  challenges: ChallengeSummary[]
}

export type ChallengeResponse = {
  viewerId: string
  challenge: ChallengeSummary
}

export type ChallengeHabitDraftPayload = {
  name: string
  type: string
  unit: string
  category?: string
  emoji?: string
  color?: string
  description?: string
}

export type ChallengeDisciplinePayload = {
  ownerHabitId?: string
  ownerNewHabit?: ChallengeHabitDraftPayload
  challengerHabitId?: string
  challengerNewHabit?: ChallengeHabitDraftPayload
  dailyGoal?: number
}

export type CreateChallengePayload = {
  type: ChallengeType
  opponentId?: string
  title?: string
  startDate?: string | null
  endDate?: string | null
  disciplines: ChallengeDisciplinePayload[]
}

export type RespondChallengePayload = {
  action: 'accept' | 'reject' | 'modify'
  disciplines?: ChallengeDisciplinePayload[]
  startDate?: string
  endDate?: string | null
}
