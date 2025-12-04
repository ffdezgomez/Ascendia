import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FriendsApi } from '../lib/friends'
import type { FriendRequestSummary, FriendSummary, PendingDirection } from '../types/friends'
import { ErrorPanel, IconSpinner, InputField, Toast } from '../components/UI'
import { FriendAvatar } from '../components/FriendAvatar'

function FriendRow({
  friend,
  onOpen,
  onRemove
}: {
  friend: FriendSummary
  onOpen: (friend: FriendSummary) => void
  onRemove: (friend: FriendSummary) => void
}) {
  return (
    <div className="flex items-center rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2">
      <button
        type="button"
        onClick={() => onOpen(friend)}
        className="group flex flex-1 min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <FriendAvatar username={friend.username} avatar={friend.avatar} className="h-12 w-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100 leading-tight no-underline underline-offset-2 transition group-hover:underline">
            {friend.username}
          </p>
          <p className="text-[11px] text-zinc-500">Ver dashboard</p>
        </div>
      </button>
      <button
        type="button"
        aria-label={`Eliminar a ${friend.username}`}
        className="ml-2 px-1 text-base font-semibold text-zinc-500 transition hover:text-rose-400 focus-visible:outline-none"
        onClick={() => onRemove(friend)}
      >
        ×
      </button>
    </div>
  )
}

function RequestTile({
  request,
  type,
  onAccept,
  onDecline
}: {
  request: FriendRequestSummary
  type: 'incoming' | 'outgoing'
  onAccept?: (req: FriendRequestSummary) => void
  onDecline: (req: FriendRequestSummary) => void
}) {
  const label = type === 'incoming' ? 'Solicitud recibida' : 'Solicitud enviada'

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FriendAvatar username={request.user.username} avatar={request.user.avatar} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{request.user.username}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {type === 'incoming' && onAccept && (
          <button
            className="rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-zinc-950 shadow"
            onClick={() => onAccept(request)}
          >
            Aceptar
          </button>
        )}
        <button
          className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200"
          onClick={() => onDecline(request)}
        >
          {type === 'incoming' ? 'Rechazar' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}

function SearchResultCard({
  result,
  onSend
}: {
  result: { user: FriendSummary; alreadyFriends: boolean; pendingDirection: PendingDirection } | null
  onSend: () => void
}) {
  if (!result) return null

  const { user, alreadyFriends, pendingDirection } = result
  let hint = 'Puedes enviar una solicitud'
  if (alreadyFriends) hint = 'Ya sois amigos'
  else if (pendingDirection === 'outgoing') hint = 'Solicitud pendiente'
  else if (pendingDirection === 'incoming') hint = 'Tienes una solicitud de esta persona'

  return (
    <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/60 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <FriendAvatar username={user.username} avatar={user.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.username}</p>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
        <button
          disabled={alreadyFriends || pendingDirection !== null}
          onClick={onSend}
          className="rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:bg-white/20 disabled:text-zinc-500"
        >
          {pendingDirection === 'outgoing'
            ? 'Enviada'
            : pendingDirection === 'incoming'
              ? 'Ver solicitud'
              : alreadyFriends
                ? 'Amigos'
                : 'Agregar'}
        </button>
      </div>
    </div>
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const overviewQuery = useQuery({
    queryKey: ['friends', 'overview'],
    queryFn: FriendsApi.overview,
    staleTime: 60_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  })

  const searchQuery = useQuery({
    queryKey: ['friends', 'search', search],
    queryFn: () => FriendsApi.search(search),
    enabled: search.trim().length >= 3,
    retry: false
  })

  const sendMutation = useMutation({
    mutationFn: (username: string) => FriendsApi.sendRequest(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      setFeedback('Solicitud enviada')
      setTimeout(() => setFeedback(null), 1500)
    }
  })

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => FriendsApi.acceptRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      setFeedback('Solicitud aceptada')
      setTimeout(() => setFeedback(null), 1500)
    }
  })

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => FriendsApi.declineRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      setFeedback('Solicitud actualizada')
      setTimeout(() => setFeedback(null), 1500)
    }
  })

  const removeMutation = useMutation<unknown, Error, { id: string; username: string }>({
    mutationFn: ({ id }: { id: string }) => FriendsApi.removeFriend(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['friends', 'overview'] })
      qc.removeQueries({ queryKey: ['friends', 'dashboard', variables.username] })
      setFeedback('Amigo eliminado')
      setTimeout(() => setFeedback(null), 1500)
    }
  })

  const friends = overviewQuery.data?.friends ?? []
  const incoming = overviewQuery.data?.incoming ?? []
  const outgoing = overviewQuery.data?.outgoing ?? []

  const searchResult = useMemo(() => {
    if (!searchQuery.data) return null
    return searchQuery.data
  }, [searchQuery.data])

  if (overviewQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center text-white">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-5 py-3">
          <IconSpinner />
          <span className="text-sm">Cargando amigos…</span>
        </div>
      </div>
    )
  }

  if (overviewQuery.isError) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center px-6 py-16">
        <ErrorPanel message={(overviewQuery.error as Error)?.message ?? 'No se pudo cargar tus amigos'} onRetry={() => overviewQuery.refetch()} />
      </div>
    )
  }

  const handleAccept = (req: FriendRequestSummary) => acceptMutation.mutate(req.id)
  const handleDecline = (req: FriendRequestSummary) => declineMutation.mutate(req.id)
  const handleSend = () => {
    if (!searchResult) return
    sendMutation.mutate(searchResult.user.username)
  }

  const handleRemove = (friend: FriendSummary) => {
    const confirmRemoval = window.confirm(`¿Eliminar a ${friend.username} de tus amigos?`)
    if (!confirmRemoval) return
    removeMutation.mutate({ id: friend.id, username: friend.username })
  }

  const handleOpenDashboard = (friend: FriendSummary) => {
    navigate(`/friends/${friend.username}`, { state: { friend } })
  }

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Conecta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Amistades</h1>
          <p className="text-sm text-zinc-400">Busca usuarios, envía solicitudes y gestiona las invitaciones pendientes.</p>
        </header>

        <div className="rounded-[26px] border border-zinc-800/70 bg-zinc-950/70 p-4 md:p-6">
          <InputField
            label="Buscar usuario"
            placeholder="Escribe un nombre de usuario"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3"
          />
          {search.length > 0 && search.length < 3 && (
            <p className="text-xs text-zinc-500">Introduce al menos 3 caracteres</p>
          )}
          {searchQuery.isLoading && (
            <p className="mt-3 text-sm text-zinc-400">Buscando…</p>
          )}
          {searchQuery.isError && (
            <p className="mt-3 text-sm text-rose-400">{(searchQuery.error as Error).message}</p>
          )}
          {!searchQuery.isFetching && searchQuery.data && (
            <div className="mt-4">
              <SearchResultCard result={searchResult} onSend={handleSend} />
            </div>
          )}
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Amigos</h2>
            <span className="text-xs text-zinc-500">{friends.length} en total</span>
          </div>

          {friends.length === 0 ? (
            <p className="text-sm text-zinc-500">Todavía no tienes amigos agregados.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {friends.map((friend) => (
                <FriendRow key={friend.id} friend={friend} onOpen={handleOpenDashboard} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Solicitudes</h2>
            <span className="text-xs text-zinc-500">
              {incoming.length} recibidas · {outgoing.length} enviadas
            </span>
          </div>
          <div className="space-y-3">
            {incoming.length === 0 && outgoing.length === 0 ? (
              <p className="text-sm text-zinc-500">No tienes solicitudes pendientes.</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((req) => (
                  <RequestTile key={req.id} request={req} type="incoming" onAccept={handleAccept} onDecline={handleDecline} />
                ))}
                {outgoing.map((req) => (
                  <RequestTile key={req.id} request={req} type="outgoing" onDecline={handleDecline} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Toast show={Boolean(feedback)}>{feedback}</Toast>
    </>
  )
}
