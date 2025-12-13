import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChallengesApi } from '../lib/challenges'
import { FriendsApi } from '../lib/friends'
import type { ChallengeDisciplinePayload, ChallengeHabitDraftPayload, ChallengeSummary, ChallengeStatus, ChallengeType } from '../types/challenges'
import { ErrorPanel, IconSpinner, InputField, Toast } from '../components/UI'
import { EMOJI_OPTIONS } from '../constants/emojiOptions'
import { DatePickerField } from '../components/DatePickerField'

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(/\/+$/, '')

const STATUS_FILTERS: Array<{ id: 'all' | ChallengeStatus; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'active', label: 'En curso' },
  { id: 'pending_finish', label: 'Cierre pendiente' },
  { id: 'finished', label: 'Finalizados' }
]

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  pending_finish: 'Cierre solicitado',
  finished: 'Finalizado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado'
}

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-200 border border-amber-500/40',
  active: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
  pending_finish: 'bg-sky-500/15 text-sky-200 border border-sky-400/40',
  finished: 'bg-zinc-800 text-zinc-200 border border-zinc-700/80',
  rejected: 'bg-rose-500/15 text-rose-200 border border-rose-500/40',
  cancelled: 'bg-zinc-800 text-zinc-200 border border-zinc-700/80'
}

type HabitCategory = 'fitness' | 'study' | 'health' | 'personal' | 'work' | 'creativity' | 'spirituality' | 'home'

const HABIT_CATEGORY_OPTIONS: Array<{ id: HabitCategory; label: string }> = [
  { id: 'fitness', label: 'Fitness' },
  { id: 'study', label: 'Estudio' },
  { id: 'health', label: 'Salud' },
  { id: 'personal', label: 'Personal' },
  { id: 'work', label: 'Trabajo' },
  { id: 'creativity', label: 'Creatividad' },
  { id: 'spirituality', label: 'Espiritualidad' },
  { id: 'home', label: 'Hogar' }
]

type TrackingPresetId = 'hours' | 'count' | 'checkbox' | 'number' | 'km' | 'calories' | 'weight'

type TrackingPreset = {
  id: TrackingPresetId
  label: string
  description: string
  backendType: string
  defaultUnit: string
}

const TRACKING_PRESETS: TrackingPreset[] = [
  { id: 'hours', label: 'Horas', description: 'Tiempo invertido (h)', backendType: 'time', defaultUnit: 'h' },
  { id: 'count', label: 'Veces', description: 'Número de repeticiones', backendType: 'count', defaultUnit: 'times' },
  { id: 'checkbox', label: 'Check', description: 'Solo completado/no completado', backendType: 'boolean', defaultUnit: 'check' },
  { id: 'number', label: 'Número', description: 'Valor libre (u)', backendType: 'number', defaultUnit: 'u' },
  { id: 'km', label: 'Kilómetros', description: 'Distancia (km)', backendType: 'number', defaultUnit: 'km' },
  { id: 'calories', label: 'Calorías', description: 'Energía (kcal)', backendType: 'number', defaultUnit: 'kcal' },
  { id: 'weight', label: 'Peso', description: 'Kilogramos (kg)', backendType: 'number', defaultUnit: 'kg' }
]

type HabitSource = 'existing' | 'new'

type HabitDraftState = {
  name: string
  category: HabitCategory
  trackingPreset: TrackingPresetId
  type: string
  unit: string
  emoji: string
}

type HabitOption = {
  id: string
  name: string
  type: string
  unit: string
  emoji?: string
}

type DraftDiscipline = {
  id: string
  ownerHabitMode: HabitSource
  ownerHabitId: string
  ownerDraft: HabitDraftState
  challengerHabitMode: HabitSource
  challengerHabitId: string
  challengerDraft: HabitDraftState
  dailyGoal: string
}

async function fetchOwnHabits(): Promise<HabitOption[]> {
  const res = await fetch(`${API_BASE}/habit`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  const habits = await res.json()
  return (habits || []).map((habit: any) => ({
    id: String(habit._id),
    name: habit.name,
    type: habit.type,
    unit: habit.unit,
    emoji: habit.emoji ?? ''
  }))
}

const DEFAULT_PRESET_ID: TrackingPresetId = 'count'

function buildHabitDraftState(): HabitDraftState {
  const preset = TRACKING_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? TRACKING_PRESETS[0]
  return {
    name: '',
    category: 'personal',
    trackingPreset: preset.id,
    type: preset.backendType,
    unit: preset.defaultUnit,
    emoji: ''
  }
}

function buildDiscipline(): DraftDiscipline {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ownerHabitMode: 'existing',
    ownerHabitId: '',
    ownerDraft: buildHabitDraftState(),
    challengerHabitMode: 'existing',
    challengerHabitId: '',
    challengerDraft: buildHabitDraftState(),
    dailyGoal: ''
  }
}

function formatDateRange(start: string, end: string | null) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  const startLabel = Number.isNaN(startDate.valueOf()) ? 'Sin fecha' : startDate.toLocaleDateString('es-ES', opts)
  const endLabel = endDate && !Number.isNaN(endDate.valueOf()) ? endDate.toLocaleDateString('es-ES', opts) : 'Sin definir'
  return `${startLabel} · ${endLabel}`
}

function percentage(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.max(0, Math.round(value * 100))}%`
}

function barWidth(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.max(0, Math.min(100, value * 100))}%`
}

const amountFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 0 })

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return '0'
  return amountFormatter.format(value)
}

function friendlyType(type: ChallengeType) {
  return type === 'friend' ? 'Amigos' : 'Personal'
}

function isCheckboxType(type?: string | null) {
  if (!type) return false
  return type === 'boolean' || type === 'checkbox' || type === 'check'
}

function getPresetLabelFrom(type?: string | null, unit?: string | null) {
  if (!type) return null
  const preset = TRACKING_PRESETS.find((candidate) => {
    if (candidate.backendType !== type) return false
    if (!unit) return true
    return candidate.defaultUnit === unit
  })
  return preset?.label ?? null
}

function ChallengeCard({
  challenge,
  viewerId,
  onAccept,
  onReject,
  onRequestFinish,
  onDeclineFinish,
  onDelete
}: {
  challenge: ChallengeSummary
  viewerId: string
  onAccept: (challengeId: string) => void
  onReject: (challengeId: string) => void
  onRequestFinish: (challengeId: string) => void
  onDeclineFinish: (challengeId: string) => void
  onDelete: (challengeId: string) => void
}) {
  const viewerIsOwner = challenge.ownerId === viewerId
  const viewerDisplay = 'Tú'
  const rivalDisplay = viewerIsOwner
    ? (challenge.opponent?.username ?? (challenge.type === 'friend' ? 'Amigo' : 'Meta personal'))
    : (challenge.owner?.username ?? 'Creador')
  const viewerWins = viewerIsOwner ? challenge.ownerWins : challenge.opponentWins
  const rivalWins = viewerIsOwner ? challenge.opponentWins : challenge.ownerWins
  const waitingForViewer = challenge.status === 'pending' && challenge.awaitingUserId === viewerId
  const canRespond = waitingForViewer
  const viewerRequestedFinish = viewerIsOwner ? challenge.ownerRequestedFinish : challenge.opponentRequestedFinish
  const rivalRequestedFinish = viewerIsOwner ? challenge.opponentRequestedFinish : challenge.ownerRequestedFinish
  const canConfirmFinish = challenge.status === 'pending_finish' && !viewerRequestedFinish && rivalRequestedFinish
  const canRequestFinish = challenge.status === 'active' && !viewerRequestedFinish
  const canDeclineFinish = canConfirmFinish
  const canDelete = ['finished', 'rejected', 'cancelled'].includes(challenge.status) || (challenge.status === 'pending' && viewerIsOwner)
  const waitingForRivalConfirmation = challenge.status === 'pending_finish' && viewerRequestedFinish && !rivalRequestedFinish
  const shouldAutoExpand = canRespond || canConfirmFinish || canRequestFinish || waitingForRivalConfirmation
  const [expanded, setExpanded] = useState(shouldAutoExpand)
  const hasPendingAction = canRespond || canConfirmFinish || canRequestFinish || waitingForRivalConfirmation

  const Chevron = ({ open }: { open: boolean }) => (
    <svg
      className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <article className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 p-5 shadow-[0_18px_35px_rgba(0,0,0,0.45)]">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{friendlyType(challenge.type)}</p>
          <h3 className="text-lg font-semibold text-zinc-50">{challenge.title || `Reto con ${rivalDisplay}`}</h3>
          <p className="text-xs text-zinc-400">{formatDateRange(challenge.startDate, challenge.endDate)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_COLORS[challenge.status]}`}>
            {STATUS_LABELS[challenge.status]}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold text-zinc-200 transition-colors ${hasPendingAction ? 'border-emerald-400/70 text-emerald-200' : 'border-zinc-800 hover:border-zinc-600'}`}
          >
            {expanded ? 'Ocultar' : 'Ver detalles'}
            <Chevron open={expanded} />
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-zinc-500">Marcador</p>
          <p className="text-2xl font-semibold text-zinc-50">{viewerWins} - {rivalWins}</p>
          {challenge.draws > 0 && <p className="text-xs text-zinc-500">{challenge.draws} empates</p>}
        </div>
        <div className="flex-1 space-y-1 text-sm text-zinc-300">
          <p><span className="font-semibold text-zinc-100">{viewerDisplay}</span> vs <span className="font-semibold text-zinc-100">{rivalDisplay}</span></p>
          <p className="text-xs text-zinc-500">Duración: {challenge.durationDays} días</p>
        </div>
      </div>

      {expanded && (
        <>
          <div className="mt-4 space-y-3">
            {challenge.disciplines.map((discipline) => {
              const viewerSide = viewerIsOwner ? discipline.owner : discipline.challenger ?? discipline.owner
              const rivalSide = viewerIsOwner ? discipline.challenger : discipline.owner
              const unitLabel = viewerSide.habit?.unit ? ` ${viewerSide.habit?.unit}` : ''
              const viewerDailyLabel = `${formatAmount(viewerSide.todayTotal)} / ${formatAmount(viewerSide.dailyGoal)}${unitLabel}`
              const rivalUnitLabel = rivalSide?.habit?.unit ? ` ${rivalSide.habit?.unit}` : ''
              const rivalDailyLabel = rivalSide ? `${formatAmount(rivalSide.todayTotal)} / ${formatAmount(rivalSide.dailyGoal)}${rivalUnitLabel}` : ''
              const isCheckDiscipline = isCheckboxType(viewerSide.habit?.type)
              const objectiveLabel = isCheckDiscipline
                ? 'Objetivo: Check diario'
                : `Objetivo: ${viewerSide.dailyGoal} ${viewerSide.habit?.unit ?? ''} / día`
              const viewerProgressLabel = isCheckDiscipline
                ? `${viewerSide.todayTotal >= 1 ? 'Completado hoy' : 'Pendiente hoy'}`
                : `${viewerDailyLabel} · ${percentage(viewerSide.todayCompletionRatio)}`
              const rivalProgressLabel = rivalSide
                ? isCheckboxType(rivalSide.habit?.type)
                  ? `${rivalSide.todayTotal >= 1 ? 'Completado hoy' : 'Pendiente hoy'}`
                  : `${rivalDailyLabel} · ${percentage(rivalSide.todayCompletionRatio)}`
                : ''
              const viewerDisciplineScore = viewerIsOwner ? discipline.ownerScore : discipline.opponentScore
              const rivalDisciplineScore = viewerIsOwner ? discipline.opponentScore : discipline.ownerScore
              const pendingOpponentHabit = discipline.pendingChallengerHabit
              return (
                <div key={discipline.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                    <p className="font-semibold text-zinc-100">{viewerSide.habit?.emoji || '🔥'} {viewerSide.habit?.name || 'Hábito compartido'}</p>
                    <span className="text-xs text-zinc-500">{objectiveLabel}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-zinc-400">
                    <span>Marcador disciplina</span>
                    <span className="font-semibold text-zinc-100">
                      {viewerDisciplineScore}{rivalSide ? ` - ${rivalDisciplineScore}` : ''}
                      {discipline.draws > 0 ? ` · ${discipline.draws} emp.` : ''}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                        <span>{viewerDisplay}</span>
                        <span>{viewerProgressLabel}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: barWidth(viewerSide.todayCompletionRatio) }} />
                      </div>
                    </div>
                    {rivalSide && (
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                          <span>{rivalDisplay}</span>
                          <span>{rivalProgressLabel}</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800">
                          <div className="h-2 rounded-full bg-sky-500" style={{ width: barWidth(rivalSide.todayCompletionRatio) }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {discipline.winner && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Último ganador: {discipline.winner === 'draw' ? 'Empate' : (discipline.winner === (viewerIsOwner ? 'owner' : 'challenger') ? viewerDisplay : rivalDisplay)}
                    </p>
                  )}
                  {pendingOpponentHabit && challenge.status === 'pending' && (
                    <p className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                      El hábito del amigo aún no existe. Crearemos “{pendingOpponentHabit.emoji || '🆕'} {pendingOpponentHabit.name} ({pendingOpponentHabit.unit})” en su dashboard cuando acepte este reto.
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canRespond && (
              <>
                <button
                  type="button"
                  className="rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-emerald-950"
                  onClick={() => onAccept(challenge.id)}
                >
                  Aceptar reto
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-200"
                  onClick={() => onReject(challenge.id)}
                >
                  Rechazar
                </button>
              </>
            )}

            {!canRespond && challenge.status === 'pending' && (
              <p className="text-xs text-zinc-500">Esperando respuesta de {rivalDisplay}</p>
            )}

            {canConfirmFinish ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-zinc-900 shadow"
                  onClick={() => onRequestFinish(challenge.id)}
                >
                  Confirmar cierre
                </button>
                {canDeclineFinish && (
                  <button
                    type="button"
                    className="rounded-full border border-rose-400/70 px-4 py-1.5 text-xs font-semibold text-rose-100"
                    onClick={() => onDeclineFinish(challenge.id)}
                  >
                    Rechazar cierre
                  </button>
                )}
              </div>
            ) : canRequestFinish ? (
              <button
                type="button"
                className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-zinc-900 shadow"
                onClick={() => onRequestFinish(challenge.id)}
              >
                Solicitar cierre
              </button>
            ) : null}

            {waitingForRivalConfirmation && (
              <span className="text-xs text-zinc-500">Solicitud enviada. Esperando a {rivalDisplay}.</span>
            )}

            {canConfirmFinish && (
              <span className="text-xs text-zinc-500">{viewerIsOwner ? rivalDisplay : 'Tu amigo'} pidió cerrar este reto.</span>
            )}

            {canDelete && (
              <button
                type="button"
                className="ml-auto rounded-full border border-rose-500/50 px-4 py-1.5 text-xs font-semibold text-rose-200"
                onClick={() => onDelete(challenge.id)}
              >
                Eliminar reto
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}

export default function ChallengesPage() {
  const [filter, setFilter] = useState<'all' | ChallengeStatus>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState('')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [disciplines, setDisciplines] = useState<DraftDiscipline[]>([buildDiscipline()])
  const [expandedDisciplineId, setExpandedDisciplineId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null)
  const [categoryPickerOpenId, setCategoryPickerOpenId] = useState<string | null>(null)
  const [trackingPickerOpenId, setTrackingPickerOpenId] = useState<string | null>(null)

  const qc = useQueryClient()

  function pushFeedback(message: string) {
    setFeedback(message)
    window.setTimeout(() => setFeedback(null), 1800)
  }

  const challengesQuery = useQuery({ queryKey: ['challenges'], queryFn: ChallengesApi.list })
  const friendsQuery = useQuery({ queryKey: ['friends', 'overview'], queryFn: FriendsApi.overview, staleTime: 60_000 })
  const habitsQuery = useQuery({ queryKey: ['habits', 'mine'], queryFn: fetchOwnHabits })
  const friendHabitsQuery = useQuery({
    queryKey: ['friends', 'dashboard', selectedFriend],
    queryFn: () => FriendsApi.dashboard(selectedFriend).then((res) => res.habits),
    enabled: Boolean(selectedFriend)
  })

  const createMutation = useMutation({
    mutationFn: ChallengesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges'] })
      qc.invalidateQueries({ queryKey: ['habits', 'mine'] })
      pushFeedback('Reto enviado')
      setDrawerOpen(false)
      setSelectedFriend('')
      setTitle('')
      setStartDate('')
      setEndDate('')
      setDisciplines([buildDiscipline()])
      setExpandedDisciplineId(null)
      setFormError(null)
    }
  })

  const respondMutation = useMutation({
    mutationFn: ({ challengeId, action }: { challengeId: string; action: 'accept' | 'reject' }) =>
      ChallengesApi.respond(challengeId, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges'] })
      pushFeedback('Estado actualizado')
    }
  })

  const finishMutation = useMutation({
    mutationFn: (challengeId: string) => ChallengesApi.requestFinish(challengeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges'] })
      pushFeedback('Solicitud enviada')
    }
  })

  const declineFinishMutation = useMutation({
    mutationFn: (challengeId: string) => ChallengesApi.declineFinish(challengeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges'] })
      pushFeedback('Solicitud rechazada')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (challengeId: string) => ChallengesApi.remove(challengeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges'] })
      pushFeedback('Reto eliminado')
    }
  })

  const challengesData = challengesQuery.data?.challenges
  const viewerId = challengesQuery.data?.viewerId ?? ''

  const filteredChallenges = useMemo(() => {
    const list = challengesData ?? []
    if (filter === 'all') return list
    return list.filter((challenge) => challenge.status === filter)
  }, [challengesData, filter])

  const ownHabits = habitsQuery.data ?? []
  const friendHabits = friendHabitsQuery.data ?? []
  const friends = friendsQuery.data?.friends ?? []

  useEffect(() => {
    if (ownHabits.length === 0) {
      setDisciplines((prev) => prev.map((discipline) => (
        discipline.ownerHabitMode === 'existing'
          ? { ...discipline, ownerHabitMode: 'new' }
          : discipline
      )))
    }
  }, [ownHabits.length])

  useEffect(() => {
    if (selectedFriend && friendHabits.length === 0) {
      setDisciplines((prev) => prev.map((discipline) => (
        discipline.challengerHabitMode === 'existing'
          ? { ...discipline, challengerHabitMode: 'new' }
          : discipline
      )))
    }
  }, [selectedFriend, friendHabits.length])

  useEffect(() => {
    if (!drawerOpen) {
      setEmojiPickerOpenId(null)
      setCategoryPickerOpenId(null)
      setTrackingPickerOpenId(null)
    }
  }, [drawerOpen])

  useEffect(() => {
    if (disciplines.length === 0) {
      setExpandedDisciplineId(null)
      return
    }
    setExpandedDisciplineId((prev) => {
      if (prev && disciplines.some((discipline) => discipline.id === prev)) {
        return prev
      }
      return disciplines[0].id
    })
  }, [disciplines])

  function updateDiscipline(id: string, patch: Partial<DraftDiscipline>) {
    setDisciplines((prev) => prev.map((discipline) => (discipline.id === id ? { ...discipline, ...patch } : discipline)))
  }

  function updateHabitDraft(disciplineId: string, target: 'owner' | 'challenger', patch: Partial<HabitDraftState>) {
    const key: 'ownerDraft' | 'challengerDraft' = target === 'owner' ? 'ownerDraft' : 'challengerDraft'
    setDisciplines((prev) => prev.map((discipline) => (
      discipline.id === disciplineId
        ? { ...discipline, [key]: { ...discipline[key], ...patch } }
        : discipline
    )))
  }

  function setHabitMode(disciplineId: string, target: 'owner' | 'challenger', mode: HabitSource) {
    const modeKey: 'ownerHabitMode' | 'challengerHabitMode' = target === 'owner' ? 'ownerHabitMode' : 'challengerHabitMode'
    setDisciplines((prev) => prev.map((discipline) => (
      discipline.id === disciplineId
        ? { ...discipline, [modeKey]: mode }
        : discipline
    )))
  }

  function applyPresetToDraft(disciplineId: string, target: 'owner' | 'challenger', presetId: TrackingPresetId) {
    const preset = TRACKING_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    updateHabitDraft(disciplineId, target, {
      trackingPreset: preset.id,
      type: preset.backendType,
      unit: preset.defaultUnit
    })
  }

  function addDiscipline() {
    const next = buildDiscipline()
    setDisciplines((prev) => [...prev, next])
    setExpandedDisciplineId(next.id)
  }

  function removeDiscipline(id: string) {
    setDisciplines((prev) => (prev.length === 1 ? prev : prev.filter((discipline) => discipline.id !== id)))
  }

  const friendLabel = friends.find((friend) => friend.id === selectedFriend)?.username ?? 'tu amigo'

  type OwnerSelectionResult =
    | { ok: true; type: string; unit: string; payload: { ownerHabitId?: string; ownerNewHabit?: ChallengeHabitDraftPayload } }
    | { ok: false; error: string }

  type ChallengerSelectionResult =
    | { ok: true; type: string; unit: string; payload: { challengerHabitId?: string; challengerNewHabit?: ChallengeHabitDraftPayload } }
    | { ok: false; error: string }

  function resolveOwnerSelection(discipline: DraftDiscipline): OwnerSelectionResult {
    if (discipline.ownerHabitMode === 'existing') {
      const habitId = discipline.ownerHabitId.trim()
      if (!habitId) {
        return { ok: false, error: 'Selecciona uno de tus hábitos en cada disciplina' }
      }
      const habit = ownHabits.find((h) => h.id === habitId)
      if (!habit) {
        return { ok: false, error: 'El hábito propio seleccionado ya no está disponible' }
      }
      return { ok: true, type: habit.type, unit: habit.unit, payload: { ownerHabitId: habit.id } }
    }

    const name = discipline.ownerDraft.name.trim()
    const type = discipline.ownerDraft.type.trim()
    const unit = discipline.ownerDraft.unit.trim()
    if (!name) {
      return { ok: false, error: 'El nuevo hábito propio necesita un nombre' }
    }
    if (!type || !unit) {
      return { ok: false, error: 'Completa el tipo y la unidad del nuevo hábito propio' }
    }

    return {
      ok: true,
      type,
      unit,
      payload: {
        ownerNewHabit: {
          name,
          type,
          unit,
          category: discipline.ownerDraft.category,
          emoji: discipline.ownerDraft.emoji.trim().slice(0, 4) || undefined
        }
      }
    }
  }

  function resolveChallengerSelection(discipline: DraftDiscipline): ChallengerSelectionResult {
    if (discipline.challengerHabitMode === 'existing') {
      const habitId = discipline.challengerHabitId.trim()
      if (!habitId) {
        return { ok: false, error: 'Selecciona un hábito del amigo en cada disciplina' }
      }
      const habit = friendHabits.find((h) => h.id === habitId)
      if (!habit) {
        return { ok: false, error: 'El hábito del amigo seleccionado ya no está disponible' }
      }
      return { ok: true, type: habit.type, unit: habit.unit, payload: { challengerHabitId: habit.id } }
    }

    if (!selectedFriend) {
      return { ok: false, error: 'Selecciona un amigo antes de definir un hábito nuevo para él' }
    }

    const name = discipline.challengerDraft.name.trim()
    const type = discipline.challengerDraft.type.trim()
    const unit = discipline.challengerDraft.unit.trim()
    if (!name) {
      return { ok: false, error: 'El nuevo hábito del amigo necesita un nombre' }
    }
    if (!type || !unit) {
      return { ok: false, error: 'Completa el tipo y la unidad del nuevo hábito del amigo' }
    }

    return {
      ok: true,
      type,
      unit,
      payload: {
        challengerNewHabit: {
          name,
          type,
          unit,
          category: discipline.challengerDraft.category,
          emoji: discipline.challengerDraft.emoji.trim().slice(0, 4) || undefined
        }
      }
    }
  }

  function handleCreateChallenge() {
    setFormError(null)
    if (!selectedFriend) {
      setFormError('Selecciona un amigo para enviar el reto')
      return
    }

    const normalized: ChallengeDisciplinePayload[] = []

    for (const discipline of disciplines) {
      const ownerSelection = resolveOwnerSelection(discipline)
      if (!ownerSelection.ok) {
        setFormError(ownerSelection.error)
        return
      }

      const challengerSelection = resolveChallengerSelection(discipline)
      if (!challengerSelection.ok) {
        setFormError(challengerSelection.error)
        return
      }

      if (ownerSelection.type !== challengerSelection.type || ownerSelection.unit !== challengerSelection.unit) {
        setFormError('Ambos hábitos de cada disciplina deben compartir tipo y unidad')
        return
      }

      const ownerIsCheck = isCheckboxType(ownerSelection.type)
      const numericGoal = ownerIsCheck ? undefined : Number(discipline.dailyGoal)
      if (!ownerIsCheck && (!Number.isFinite(numericGoal) || (numericGoal ?? 0) <= 0)) {
        setFormError('Define un objetivo diario válido para cada disciplina')
        return
      }

      normalized.push({
        ...ownerSelection.payload,
        ...challengerSelection.payload,
        dailyGoal: ownerIsCheck ? undefined : numericGoal
      })
    }

    if (normalized.length === 0) {
      setFormError('Añade al menos una disciplina válida')
      return
    }

    createMutation.mutate({
      type: 'friend',
      opponentId: selectedFriend,
      title: title.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      disciplines: normalized
    })
  }

  const toggleEmojiPicker = (id: string, disabled?: boolean) => {
    if (disabled) return
    setCategoryPickerOpenId(null)
    setTrackingPickerOpenId(null)
    setEmojiPickerOpenId((prev) => (prev === id ? null : id))
  }

  const toggleCategoryPicker = (id: string, disabled?: boolean) => {
    if (disabled) return
    setEmojiPickerOpenId(null)
    setTrackingPickerOpenId(null)
    setCategoryPickerOpenId((prev) => (prev === id ? null : id))
  }

  const toggleTrackingPicker = (id: string, disabled?: boolean) => {
    if (disabled) return
    setEmojiPickerOpenId(null)
    setCategoryPickerOpenId(null)
    setTrackingPickerOpenId((prev) => (prev === id ? null : id))
  }

  const renderHabitDraftFields = (discipline: DraftDiscipline, target: 'owner' | 'challenger') => {
    const draft = target === 'owner' ? discipline.ownerDraft : discipline.challengerDraft
    const disabled = target === 'challenger' && !selectedFriend
    const isChallenger = target === 'challenger'
    const description = isChallenger
      ? (selectedFriend
        ? `Se añadirá automáticamente al dashboard de ${friendLabel} cuando acepte.`
        : 'Selecciona un amigo para poder crear un hábito nuevo para él.')
      : 'Se creará en tu dashboard justo después de enviar el reto.'
    const pickerKey = `${discipline.id}-${target}-emoji`
    const pickerOpen = !disabled && emojiPickerOpenId === pickerKey
    const categoryKey = `${discipline.id}-${target}-category`
    const categoryOpen = !disabled && categoryPickerOpenId === categoryKey
    const trackingKey = `${discipline.id}-${target}-tracking`
    const trackingOpen = !disabled && trackingPickerOpenId === trackingKey
    const activePreset = TRACKING_PRESETS.find((preset) => preset.id === draft.trackingPreset)
    const activeCategoryLabel = HABIT_CATEGORY_OPTIONS.find((option) => option.id === draft.category)?.label ?? 'Selecciona una categoría'

    return (
      <div className="mt-2 space-y-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-400">Nombre del hábito</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => updateHabitDraft(discipline.id, target, { name: e.target.value })}
            disabled={disabled}
            placeholder={isChallenger ? `Ej. ${friendLabel} lee 20 min` : 'Ej. Leer 20 min'}
            className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-400">Tipo de seguimiento</p>
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleTrackingPicker(trackingKey, disabled)}
              className={`flex w-full items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-left text-sm ${disabled ? 'text-zinc-500 opacity-60' : 'text-white hover:border-zinc-500'}`}
            >
              <span>{activePreset?.label ?? 'Selecciona un tipo'}</span>
              <span className="text-xs text-zinc-400">{trackingOpen ? '↑' : '↓'}</span>
            </button>
            {!disabled && trackingOpen && (
              <div className="absolute left-0 z-30 mt-2 w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-3 text-sm shadow-2xl">
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Selecciona un tipo</p>
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {TRACKING_PRESETS.map((preset) => (
                    <button
                      key={`${trackingKey}-${preset.id}`}
                      type="button"
                      onClick={() => {
                        applyPresetToDraft(discipline.id, target, preset.id)
                        setTrackingPickerOpenId(null)
                      }}
                      className={`w-full rounded-2xl border px-3 py-2 text-left text-xs ${draft.trackingPreset === preset.id ? 'border-zinc-200 bg-white/10 text-white' : 'border-zinc-700/70 text-zinc-300 hover:border-zinc-500'}`}
                    >
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className="text-[11px] text-zinc-400">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Unidad automática: {draft.unit}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-400">Categoría</label>
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleCategoryPicker(categoryKey, disabled)}
              className={`flex w-full items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-left text-sm ${disabled ? 'text-zinc-500 opacity-60' : 'text-white hover:border-zinc-500'}`}
            >
              <span>{activeCategoryLabel}</span>
              <span className="text-xs text-zinc-400">{categoryOpen ? '↑' : '↓'}</span>
            </button>
            {!disabled && categoryOpen && (
              <div className="absolute left-0 z-30 mt-2 w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-3 shadow-2xl">
                <div className="grid gap-2 sm:grid-cols-2">
                  {HABIT_CATEGORY_OPTIONS.map((categoryOption) => (
                    <button
                      key={`${categoryKey}-${categoryOption.id}`}
                      type="button"
                      onClick={() => {
                        updateHabitDraft(discipline.id, target, { category: categoryOption.id })
                        setCategoryPickerOpenId(null)
                      }}
                      className={`rounded-2xl border px-3 py-2 text-left text-xs ${draft.category === categoryOption.id ? 'border-zinc-200 bg-white/10 text-white' : 'border-zinc-700/70 text-zinc-300 hover:border-zinc-500'}`}
                    >
                      <span className="block text-sm font-semibold">{categoryOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-400">Emoji (opcional)</label>
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleEmojiPicker(pickerKey, disabled)}
              className={`flex w-full items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-left text-sm ${disabled ? 'text-zinc-500 opacity-60' : 'text-white hover:border-zinc-500 cursor-pointer'}`}
            >
              <span>{draft.emoji || 'Selecciona un emoji'}</span>
              <span className="text-xs text-zinc-400">{pickerOpen ? '↑' : '↓'}</span>
            </button>
            {!disabled && pickerOpen && (
              <div className="absolute left-0 z-30 mt-2 w-full min-w-[16rem] rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-3 shadow-2xl">
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Selecciona un emoji</p>
                <div className="mt-2 flex flex-wrap gap-1 text-base">
                  {EMOJI_OPTIONS.map((emojiOption) => (
                    <button
                      key={`${pickerKey}-option-${emojiOption}`}
                      type="button"
                      onClick={() => {
                        updateHabitDraft(discipline.id, target, { emoji: emojiOption })
                        setEmojiPickerOpenId(null)
                      }}
                      className={`rounded-xl border px-2 py-1 text-sm ${draft.emoji === emojiOption ? 'border-zinc-100 bg-white/10 text-white' : 'border-zinc-700/70 bg-zinc-900/60 text-zinc-100 hover:border-zinc-500'}`}
                      title={`Usar ${emojiOption}`}
                    >
                      {emojiOption}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-500">{description}</p>
      </div>
    )
  }
  const renderDrawer = () => (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
      <aside className="relative z-50 flex h-full w-full max-w-4xl flex-col bg-zinc-950/95 px-6 py-6 text-sm text-white sm:px-8 md:max-w-5xl md:py-8">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Nuevo reto</p>
          <h2 className="text-xl font-semibold">Desafía a un amigo</h2>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <InputField label="Título" placeholder="Ej. Reto de lectura" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Amigo</label>
            <select
              value={selectedFriend}
              onChange={(e) => {
                const friendId = e.target.value
                setSelectedFriend(friendId)
                setDisciplines((prev) => prev.map((discipline) => ({
                  ...discipline,
                  challengerHabitId: '',
                  challengerHabitMode: friendId ? discipline.challengerHabitMode : 'existing'
                })))
              }}
              className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecciona un amigo</option>
              {friends.map((friend) => (
                <option key={friend.id} value={friend.id}>{friend.username}</option>
              ))}
            </select>
            {friends.length === 0 && <p className="mt-1 text-xs text-zinc-500">Primero añade amigos desde la pestaña de comunidad.</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DatePickerField label="Fecha de inicio" value={startDate} onChange={setStartDate} disabled={createMutation.isPending} />
            <DatePickerField label="Fecha estimada de fin" value={endDate} onChange={setEndDate} min={startDate || undefined} disabled={createMutation.isPending} />
          </div>

          <div className="space-y-4">
            {disciplines.map((discipline, index) => {
              const ownerHabitMeta = ownHabits.find((habit) => habit.id === discipline.ownerHabitId)
              const challengerHabitMeta = friendHabits.find((habit) => habit.id === discipline.challengerHabitId)
              const ownerType = discipline.ownerHabitMode === 'existing' ? ownerHabitMeta?.type : discipline.ownerDraft.type
              const ownerUnit = discipline.ownerHabitMode === 'existing' ? ownerHabitMeta?.unit : discipline.ownerDraft.unit
              const challengerType = discipline.challengerHabitMode === 'existing' ? challengerHabitMeta?.type : discipline.challengerDraft.type
              const challengerUnit = discipline.challengerHabitMode === 'existing' ? challengerHabitMeta?.unit : discipline.challengerDraft.unit
              const isCheckDiscipline = isCheckboxType(ownerType)
              const incompatibleSelection = Boolean(
                ownerType &&
                ownerUnit &&
                challengerType &&
                challengerUnit &&
                (ownerType !== challengerType || ownerUnit !== challengerUnit)
              )
              const isExpanded = expandedDisciplineId === discipline.id
              const ownerSummary = discipline.ownerHabitMode === 'existing'
                ? ownerHabitMeta
                  ? `${ownerHabitMeta.emoji ? `${ownerHabitMeta.emoji} ` : ''}${ownerHabitMeta.name}`
                  : 'Selecciona uno de tus hábitos'
                : discipline.ownerDraft.name.trim()
                  ? `${discipline.ownerDraft.emoji || '🆕'} ${discipline.ownerDraft.name}`
                  : 'Define el nuevo hábito'
              const challengerSummary = discipline.challengerHabitMode === 'existing'
                ? selectedFriend
                  ? challengerHabitMeta
                    ? `${challengerHabitMeta.emoji ? `${challengerHabitMeta.emoji} ` : ''}${challengerHabitMeta.name}`
                    : 'Selecciona un hábito del amigo'
                  : 'Selecciona un amigo'
                : discipline.challengerDraft.name.trim()
                  ? `${discipline.challengerDraft.emoji || '🆕'} ${discipline.challengerDraft.name}`
                  : 'Define el hábito del amigo'
              const presetSummary = discipline.ownerHabitMode === 'existing'
                ? getPresetLabelFrom(ownerType, ownerUnit) ?? 'Tipo no definido'
                : TRACKING_PRESETS.find((preset) => preset.id === discipline.ownerDraft.trackingPreset)?.label ?? 'Sin tipo'
              const goalSummary = isCheckDiscipline
                ? 'Check diario'
                : discipline.dailyGoal
                  ? `${discipline.dailyGoal} ${ownerUnit ?? ''}`.trim()
                  : 'Objetivo pendiente'
              const cardBaseClass = 'group rounded-[26px] border transition-all duration-300 ease-out backdrop-blur-xl'
              const cardClasses = isExpanded
                ? `${cardBaseClass} border-white/10 bg-white/5 shadow-[0_25px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/5 animate-cardGlow`
                : `${cardBaseClass} border-white/5 bg-white/[0.015] hover:border-white/15 hover:bg-white/10 hover:shadow-[0_18px_45px_rgba(0,0,0,0.45)] hover:-translate-y-0.5`

              return (
                <div
                  key={discipline.id}
                  className={`${cardClasses} p-4`}
                  onMouseEnter={() => setExpandedDisciplineId(discipline.id)}
                  onFocusCapture={() => setExpandedDisciplineId(discipline.id)}
                  onClick={() => setExpandedDisciplineId(discipline.id)}
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <span>Disciplina {index + 1}</span>
                    {disciplines.length > 1 && (
                      <button
                        type="button"
                        className="text-rose-300 normal-case"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeDiscipline(discipline.id)
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-zinc-400">Tu hábito</label>
                          <div className="inline-flex gap-2 text-[10px] font-semibold uppercase tracking-wide">
                            <button
                              type="button"
                              onClick={() => setHabitMode(discipline.id, 'owner', 'existing')}
                              className={`rounded-full px-2 py-1 ${discipline.ownerHabitMode === 'existing' ? 'bg-white/80 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}
                            >
                              Existente
                            </button>
                            <button
                              type="button"
                              onClick={() => setHabitMode(discipline.id, 'owner', 'new')}
                              className={`rounded-full px-2 py-1 ${discipline.ownerHabitMode === 'new' ? 'bg-white/80 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}
                            >
                              Crear nuevo
                            </button>
                          </div>
                        </div>
                        {discipline.ownerHabitMode === 'existing' ? (
                          <>
                            <select
                              value={discipline.ownerHabitId}
                              onChange={(e) => updateDiscipline(discipline.id, { ownerHabitId: e.target.value })}
                              className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-white"
                            >
                              <option value="">Selecciona</option>
                              {ownHabits.map((habit) => (
                                <option key={habit.id} value={habit.id}>
                                  {habit.emoji ? `${habit.emoji} ` : ''}{habit.name} · {habit.unit}
                                </option>
                              ))}
                            </select>
                            {ownHabits.length === 0 && (
                              <p className="mt-1 text-xs text-zinc-500">Aún no tienes hábitos. Cambia a "Crear nuevo" para añadirlo al vuelo.</p>
                            )}
                          </>
                        ) : (
                          renderHabitDraftFields(discipline, 'owner')
                        )}
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-zinc-400">Hábito del amigo</label>
                          <div className="inline-flex gap-2 text-[10px] font-semibold uppercase tracking-wide">
                            <button
                              type="button"
                              onClick={() => setHabitMode(discipline.id, 'challenger', 'existing')}
                              className={`rounded-full px-2 py-1 ${discipline.challengerHabitMode === 'existing' ? 'bg-white/80 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}
                              disabled={!selectedFriend}
                            >
                              Existente
                            </button>
                            <button
                              type="button"
                              onClick={() => setHabitMode(discipline.id, 'challenger', 'new')}
                              className={`rounded-full px-2 py-1 ${discipline.challengerHabitMode === 'new' ? 'bg-white/80 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}
                              disabled={!selectedFriend}
                            >
                              Crear nuevo
                            </button>
                          </div>
                        </div>
                        {discipline.challengerHabitMode === 'existing' ? (
                          <>
                            <select
                              value={discipline.challengerHabitId}
                              onChange={(e) => updateDiscipline(discipline.id, { challengerHabitId: e.target.value })}
                              className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-white"
                              disabled={!selectedFriend || friendHabitsQuery.isLoading}
                            >
                              <option value="">Selecciona</option>
                              {friendHabits.map((habit) => (
                                <option key={habit.id} value={habit.id}>
                                  {habit.emoji ? `${habit.emoji} ` : ''}{habit.name} · {habit.unit}
                                </option>
                              ))}
                            </select>
                            {!selectedFriend && <p className="mt-1 text-xs text-zinc-500">Elige un amigo para ver sus hábitos.</p>}
                            {selectedFriend && friendHabitsQuery.isLoading && <p className="mt-1 text-xs text-zinc-500">Cargando hábitos…</p>}
                            {selectedFriend && !friendHabitsQuery.isLoading && friendHabits.length === 0 && (
                              <p className="mt-1 text-xs text-zinc-500">Tu amigo aún no tiene hábitos públicos. Crea uno nuevo para esta disciplina.</p>
                            )}
                          </>
                        ) : (
                          renderHabitDraftFields(discipline, 'challenger')
                        )}
                      </div>

                      {incompatibleSelection && (
                        <p className="text-xs text-amber-300">Ambos hábitos deben usar el mismo tipo ({ownerType ?? '—'}) y unidad ({ownerUnit ?? '—'}).</p>
                      )}

                      {isCheckDiscipline ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                          Este hábito es tipo check. Solo se puede completar una vez al día, así que no necesitas definir un objetivo.
                        </div>
                      ) : (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-zinc-400">Objetivo diario</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={discipline.dailyGoal}
                            onChange={(e) => updateDiscipline(discipline.id, { dailyGoal: e.target.value })}
                            className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-white"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 rounded-2xl border border-white/5 bg-white/[0.015] p-4 text-sm text-zinc-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
                      <p className="font-semibold text-zinc-50">Resumen rápido</p>
                      <p>Tu hábito: <span className="text-white">{ownerSummary}</span></p>
                      <p>Amigo: <span className="text-white">{challengerSummary}</span></p>
                      <p>Tipo: <span className="text-white">{presetSummary}</span></p>
                      <p>Objetivo: <span className="text-white">{goalSummary}</span></p>
                      <p className="text-[11px] text-zinc-500">Pasa el cursor o toca para desplegar y editar.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addDiscipline}
            className="w-full rounded-2xl border border-dashed border-zinc-700/70 px-4 py-3 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Añadir otra disciplina
          </button>
        </div>

        {formError && <p className="mt-3 text-xs text-rose-300">{formError}</p>}
        {createMutation.error && <p className="mt-3 text-xs text-rose-300">{(createMutation.error as Error).message}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleCreateChallenge}
            disabled={createMutation.isPending}
            className="flex-1 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Enviando…' : 'Crear reto'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
            onClick={() => setDrawerOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </aside>
    </div>
  )

  if (challengesQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-5 py-3">
          <IconSpinner />
          <span className="text-sm">Cargando retos…</span>
        </div>
      </div>
    )
  }

  if (challengesQuery.isError) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-16">
        <ErrorPanel message={(challengesQuery.error as Error)?.message ?? 'No se pudo cargar tus retos'} onRetry={() => challengesQuery.refetch()} />
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Competitividad</p>
            <h1 className="text-3xl font-semibold tracking-tight">Retos</h1>
            <p className="text-sm text-zinc-400">Crea desafíos diarios para mantener la motivación con tus amigos.</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 shadow"
            onClick={() => setDrawerOpen(true)}
          >
            Nuevo reto
          </button>
        </header>

        <div className="rounded-[26px] border border-zinc-800/60 bg-zinc-950/70 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition ${filter === f.id
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredChallenges.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700/70 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
            {filter === 'all' ? 'Aún no tienes retos. Comienza creando uno.' : 'No hay retos en este estado.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                viewerId={viewerId}
                onAccept={(id) => respondMutation.mutate({ challengeId: id, action: 'accept' })}
                onReject={(id) => respondMutation.mutate({ challengeId: id, action: 'reject' })}
                onRequestFinish={(id) => finishMutation.mutate(id)}
                onDeclineFinish={(id) => declineFinishMutation.mutate(id)}
                onDelete={(id) => {
                  if (window.confirm('¿Eliminar este reto?')) {
                    deleteMutation.mutate(id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {drawerOpen && renderDrawer()}
      <Toast show={Boolean(feedback)}>{feedback}</Toast>
    </>
  )
}
