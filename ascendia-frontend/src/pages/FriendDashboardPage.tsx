import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FriendsApi } from '../lib/friends'
import type {
  ComparisonCandidatesResponse,
  FriendDashboard,
  FriendHabitSummary,
  FriendSummary,
  FriendsOverview,
  HabitComparisonSummary
} from '../types/friends'
import { FriendAvatar } from '../components/FriendAvatar'
import { ErrorPanel, IconSpinner } from '../components/UI'

const metricFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

function formatMetric(value: number) {
  if (!Number.isFinite(value)) return '0'
  return metricFormatter.format(value)
}

function describeMonthlyTotal(habit: FriendHabitSummary) {
  if (habit.type === 'time') {
    return `${formatMetric(habit.hoursThisMonth)} h / mes`
  }
  return `${formatMetric(habit.totalThisMonth)} ${habit.unit} / mes`
}

function HabitsGrid({
  summary,
  onSelectCompare
}: {
  summary: FriendDashboard | undefined
  onSelectCompare: (habit: FriendHabitSummary) => void
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  if (!summary || summary.habits.length === 0) {
    return <p className="text-sm text-zinc-500">Este amigo aún no tiene hábitos registrados.</p>
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {summary.habits.map((habit) => (
        <article key={habit.id} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 text-lg">
                {habit.emoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">{habit.name}</p>
                <p className="text-xs text-zinc-500">{habit.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{describeMonthlyTotal(habit)}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMenuOpenId((prev) => (prev === habit.id ? null : habit.id))
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 ring-1 ring-zinc-800 transition hover:text-zinc-50"
                  aria-label={`Opciones para ${habit.name}`}
                >
                  ⋯
                </button>
                {menuOpenId === habit.id && (
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-1 text-left text-xs shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-zinc-100 hover:bg-zinc-800/80"
                      onClick={() => {
                        onSelectCompare(habit)
                        setMenuOpenId(null)
                      }}
                    >
                      <span>Comparar con mi hábito…</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {habit.history.map((day) => (
              <div
                key={day.date}
                className={`h-2.5 flex-1 rounded-full ${day.completed ? 'bg-emerald-400/80' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
            <span>{habit.completedToday ? 'Completado hoy' : 'Pendiente hoy'}</span>
            <span>{habit.streak} días de racha</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ComparisonCard({
  comparison,
  onRemove,
  isRemoving
}: {
  comparison: HabitComparisonSummary
  onRemove: (id: string) => void
  isRemoving: boolean
}) {
  const unitLabel = comparison.unit || comparison.friendHabit.unit
  const friendValue = formatMetric(comparison.friendHabit.totalThisMonth)
  const ownerValue = formatMetric(comparison.ownerHabit.totalThisMonth)
  const delta = comparison.deltaThisMonth

  let statusLabel = 'Van igualados'
  let statusTone = 'text-zinc-400'
  if (delta > 0) {
    statusLabel = `Vas por delante +${formatMetric(delta)} ${unitLabel}`
    statusTone = 'text-emerald-300'
  } else if (delta < 0) {
    statusLabel = `Tu amigo va por delante +${formatMetric(Math.abs(delta))} ${unitLabel}`
    statusTone = 'text-amber-300'
  }

  return (
    <article className="rounded-2xl border border-zinc-800/70 bg-zinc-900/80 p-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Comparación activa</p>
          <p className="text-sm font-semibold text-zinc-100">
            {comparison.friendHabit.name}{' '}
            <span className="text-zinc-500">vs</span>{' '}
            {comparison.ownerHabit.name}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-zinc-400 hover:text-rose-300"
          onClick={() => onRemove(comparison.id)}
          disabled={isRemoving}
        >
          {isRemoving ? 'Eliminando…' : 'Quitar'}
        </button>
      </header>
      <div className="mt-3 grid gap-3 text-sm text-zinc-200 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-950/40 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Tu amigo</p>
          <p className="text-lg font-semibold text-zinc-50">
            {friendValue} {unitLabel}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-950/40 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Tú</p>
          <p className="text-lg font-semibold text-zinc-50">
            {ownerValue} {unitLabel}
          </p>
        </div>
      </div>
      <p className={`mt-3 text-xs font-semibold ${statusTone}`}>{statusLabel}</p>
    </article>
  )
}

export default function FriendDashboardPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const state = location.state as { friend?: FriendSummary } | undefined
  const friendFromState = state?.friend

  const overview = queryClient.getQueryData<FriendsOverview>(['friends', 'overview'])
  const friendFromCache = overview?.friends.find((f) => f.username === username)

  const lookupQuery = useQuery<FriendSummary | null>({
    queryKey: ['friends', 'lookup', username],
    enabled: Boolean(username) && !friendFromState && !friendFromCache,
    queryFn: async () => {
      const result = await FriendsApi.search(username ?? '')
      if (!result.alreadyFriends) {
        return null
      }
      return result.user
    },
    staleTime: 60_000
  })

  const friend = friendFromState ?? friendFromCache ?? lookupQuery.data ?? null
  const friendId = friend?.id

  const [habitToCompare, setHabitToCompare] = useState<FriendHabitSummary | null>(null)
  const [selectedOwnerHabitId, setSelectedOwnerHabitId] = useState<string | null>(null)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  const [pendingComparisonId, setPendingComparisonId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedOwnerHabitId(null)
  }, [habitToCompare?.id])

  const dashboardQuery = useQuery({
    queryKey: ['friends', 'dashboard', username],
    queryFn: () => FriendsApi.dashboard(friendId!),
    enabled: Boolean(friendId),
    staleTime: 30_000
  })

  const comparisonCandidatesQuery = useQuery<ComparisonCandidatesResponse>({
    queryKey: ['friends', 'comparison-candidates', friendId, habitToCompare?.id],
    queryFn: () => FriendsApi.comparisonCandidates(friendId!, habitToCompare!.id),
    enabled: Boolean(friendId && habitToCompare),
    staleTime: 15_000
  })

  const comparisons = dashboardQuery.data?.comparisons ?? []

  const closeComparisonModal = () => {
    setHabitToCompare(null)
    setSelectedOwnerHabitId(null)
    setComparisonError(null)
  }

  const createComparisonMutation = useMutation({
    mutationFn: async (ownerHabitId: string) => {
      if (!friendId || !habitToCompare) {
        throw new Error('Selecciona un hábito para comparar')
      }
      return FriendsApi.createComparison(friendId, {
        friendHabitId: habitToCompare.id,
        ownerHabitId
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'dashboard', username] })
      setComparisonError(null)
      closeComparisonModal()
    },
    onError: (error: Error) => {
      setComparisonError(error.message)
    }
  })

  const deleteComparisonMutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      if (!friendId) {
        throw new Error('No se pudo identificar al amigo')
      }
      return FriendsApi.deleteComparison(friendId, comparisonId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'dashboard', username] })
      setComparisonError(null)
    },
    onError: (error: Error) => {
      setComparisonError(error.message)
    }
  })

  const handleRemoveComparison = (comparisonId: string) => {
    setPendingComparisonId(comparisonId)
    deleteComparisonMutation.mutate(comparisonId, {
      onSettled: () => setPendingComparisonId(null)
    })
  }

  const handleConfirmComparison = () => {
    if (!selectedOwnerHabitId) return
    createComparisonMutation.mutate(selectedOwnerHabitId)
  }

  const candidateHabits = comparisonCandidatesQuery.data?.habits ?? []
  const candidateUnit = comparisonCandidatesQuery.data?.unit ?? habitToCompare?.unit ?? ''
  const takenHabitIds = new Set(
    habitToCompare
      ? comparisons.filter((comparison) => comparison.friendHabit.id === habitToCompare.id).map((comparison) => comparison.ownerHabit.id)
      : []
  )
  const showComparisonModal = Boolean(friendId && habitToCompare)

  return (
    <div className="px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <button
          type="button"
          className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
          onClick={() => navigate(-1)}
        >
          ← Volver a amigos
        </button>

        <div className="flex items-center gap-3">
          <FriendAvatar username={friend?.username ?? username ?? 'Amigo'} avatar={friend?.avatar} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">{friend?.username ?? username ?? 'Amigo'}</h1>
          </div>
        </div>

        {comparisonError && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {comparisonError}
          </div>
        )}

        {(!friendId && lookupQuery.isFetching) && (
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
            <IconSpinner />
            <span className="text-sm text-zinc-400">Preparando dashboard…</span>
          </div>
        )}

        {lookupQuery.isError && (
          <ErrorPanel
            message={(lookupQuery.error as Error)?.message ?? 'No se pudo localizar a este amigo'}
            onRetry={() => lookupQuery.refetch()}
          />
        )}

        {friendId && dashboardQuery.isLoading && (
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/70 px-4 py-3">
            <IconSpinner />
            <span className="text-sm text-zinc-400">Cargando métricas…</span>
          </div>
        )}

        {dashboardQuery.isError && (
          <ErrorPanel
            message={(dashboardQuery.error as Error)?.message ?? 'No se pudo cargar el dashboard'}
            onRetry={() => dashboardQuery.refetch()}
          />
        )}

        {friendId && !dashboardQuery.isLoading && !dashboardQuery.isError && comparisons.length > 0 && (
          <section className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Comparaciones activas</p>
                <h2 className="text-lg font-semibold text-white">{comparisons.length} en curso</h2>
              </div>
            </div>
            <div className="space-y-3">
              {comparisons.map((comparison) => (
                <ComparisonCard
                  key={comparison.id}
                  comparison={comparison}
                  onRemove={handleRemoveComparison}
                  isRemoving={pendingComparisonId === comparison.id && deleteComparisonMutation.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {friendId && !dashboardQuery.isLoading && !dashboardQuery.isError && (
          <HabitsGrid
            summary={dashboardQuery.data}
            onSelectCompare={(habit) => {
              setHabitToCompare(habit)
              setComparisonError(null)
            }}
          />
        )}

        {!friendId && !lookupQuery.isFetching && !lookupQuery.isLoading && !lookupQuery.data && (
          <p className="text-sm text-zinc-500">No se encontró información para este usuario.</p>
        )}
      </div>

      {showComparisonModal && habitToCompare && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeComparisonModal} />
          <div className="relative z-40 w-full max-w-md rounded-[28px] bg-zinc-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-zinc-800/80">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Comparar hábito</p>
                <h2 className="text-sm font-semibold text-zinc-50">{habitToCompare.name}</h2>
                <p className="text-xs text-zinc-500">Debe usar la unidad {candidateUnit || habitToCompare.unit}</p>
              </div>
              <button
                type="button"
                onClick={closeComparisonModal}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 ring-1 ring-zinc-700/80 hover:text-zinc-100"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <div className="space-y-3 text-sm">
              {comparisonCandidatesQuery.isLoading && (
                <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/70 px-3 py-2 text-zinc-400">
                  <IconSpinner />
                  <span>Buscando hábitos compatibles…</span>
                </div>
              )}

              {comparisonCandidatesQuery.isError && (
                <p className="text-sm text-rose-300">
                  {(comparisonCandidatesQuery.error as Error)?.message ?? 'No se pudieron cargar tus hábitos'}
                </p>
              )}

              {!comparisonCandidatesQuery.isLoading && !comparisonCandidatesQuery.isError && candidateHabits.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No tienes hábitos con esta unidad todavía. Crea uno desde tu dashboard para habilitar la comparación.
                </p>
              )}

              {!comparisonCandidatesQuery.isLoading && !comparisonCandidatesQuery.isError && candidateHabits.length > 0 && (
                <div className="space-y-2">
                  {candidateHabits.map((habit) => {
                    const disabled = takenHabitIds.has(habit.id)
                    const selected = selectedOwnerHabitId === habit.id
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedOwnerHabitId(habit.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${
                          selected ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/70'
                        } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-zinc-600'}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{habit.name}</p>
                          <p className="text-[11px] text-zinc-500">{describeMonthlyTotal(habit)}</p>
                        </div>
                        {disabled ? (
                          <span className="text-[11px] text-amber-300">Ya en uso</span>
                        ) : selected ? (
                          <span className="text-[18px] text-emerald-300">●</span>
                        ) : (
                          <span className="text-[14px] text-zinc-500">○</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <footer className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleConfirmComparison}
                disabled={!selectedOwnerHabitId || createComparisonMutation.isPending}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-zinc-900 shadow transition hover:bg-white disabled:opacity-50"
              >
                {createComparisonMutation.isPending ? 'Activando…' : 'Activar comparación'}
              </button>
              <button
                type="button"
                onClick={closeComparisonModal}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700/70 px-3 py-2 text-sm text-zinc-200"
              >
                Cancelar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
