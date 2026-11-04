import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl, useDocLive } from '../data/hooks'
import {
  castVote,
  clearVote,
  createOrder,
  deletePoll,
  placesQuery,
  pollRef,
  updatePoll,
  votesQuery,
} from '../data/api'
import type { Place, Poll, Vote } from '../lib/types'
import { dateTimeStr } from '../lib/format'
import { Button, Card, Empty, Spinner } from '../components/ui'

export function PollDetail() {
  const { pollId = '' } = useParams()
  const { t } = useI18n()
  const { user, member, isAdmin } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)

  const { data: poll, loading } = useDocLive<Poll>(() => pollRef(pollId), [pollId])
  const { data: votes } = useColl<Vote>(() => votesQuery(pollId), [pollId])
  const { data: places } = useColl<Place>(() => placesQuery(true), [])

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places])
  const myVote = votes.find((v) => v.id === user?.uid)

  const tally = useMemo(() => {
    if (!poll) return []
    const counts = new Map<string, { count: number; voters: string[] }>()
    for (const id of poll.candidatePlaceIds) counts.set(id, { count: 0, voters: [] })
    for (const v of votes) {
      for (const id of v.placeIds ?? []) {
        const row = counts.get(id)
        if (!row) continue
        row.count += 1
        row.voters.push(v.voterName || '—')
      }
    }
    return [...counts.entries()]
      .map(([placeId, row]) => ({ placeId, ...row }))
      .sort((a, b) => b.count - a.count)
  }, [poll, votes])

  if (loading) return <Spinner />
  if (!poll) return <Empty>{t('common.empty')}</Empty>

  const isOpen = poll.status === 'open'
  const canManage = isAdmin || poll.createdBy === user?.uid
  const maxCount = Math.max(1, ...tally.map((r) => r.count))
  const winner = tally[0]

  async function vote(placeId: string) {
    if (!user || !isOpen) return
    const current = myVote?.placeIds ?? []
    let next: string[]
    if (poll!.allowMultiple) {
      next = current.includes(placeId)
        ? current.filter((x) => x !== placeId)
        : [...current, placeId]
    } else {
      next = current[0] === placeId ? [] : [placeId]
    }
    if (next.length === 0) await clearVote(pollId, user.uid)
    else await castVote(pollId, user.uid, next, member?.displayName ?? '')
  }

  async function orderFromWinner() {
    if (!user || !winner) return
    const place = placeById.get(winner.placeId)
    if (!place) return
    setBusy(true)
    try {
      const orderId = await createOrder(
        user.uid,
        member?.displayName ?? '',
        { id: place.id, name: place.name, deliveryFee: place.deliveryFee ?? null },
        { title: poll!.title, fromPollId: pollId },
      )
      await updatePoll(pollId, { status: 'closed', resultOrderId: orderId })
      nav(`/order/${orderId}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => nav('/polls')}>
        ← {t('common.back')}
      </Button>

      <Card className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{poll.title}</h1>
        <div className="flex flex-wrap gap-x-3 text-sm text-ink-400">
          <span>
            {t('common.by')} {poll.createdByName}
          </span>
          {poll.deadline && (
            <span>
              {t('common.deadline')}: {dateTimeStr(poll.deadline)}
            </span>
          )}
          <span>{t('poll.votesN', { n: votes.length })}</span>
          {!isOpen && <span className="text-amber-400">{t('poll.closedLabel')}</span>}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {poll.resultOrderId && (
            <Button variant="primary" onClick={() => nav(`/order/${poll.resultOrderId}`)}>
              {t('poll.openedOrder')}
            </Button>
          )}
          {!poll.resultOrderId && winner && winner.count > 0 && (
            <Button variant="primary" disabled={busy} onClick={orderFromWinner}>
              {t('poll.orderFromWinner')}
            </Button>
          )}
          {canManage && (
            <>
              <Button size="sm" onClick={() => updatePoll(pollId, { status: isOpen ? 'closed' : 'open' })}>
                {isOpen ? t('poll.close') : t('poll.reopen')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!confirm(t('poll.deleteConfirm'))) return
                  await deletePoll(pollId)
                  nav('/polls')
                }}
              >
                {t('common.delete')}
              </Button>
            </>
          )}
        </div>
      </Card>

      <h2 className="text-xl font-semibold">{t('poll.results')}</h2>
      <div className="flex flex-col gap-2">
        {tally.map((row) => {
          const place = placeById.get(row.placeId)
          const mine = (myVote?.placeIds ?? []).includes(row.placeId)
          return (
            <button
              key={row.placeId}
              onClick={() => vote(row.placeId)}
              disabled={!isOpen}
              className={`relative overflow-hidden rounded-2xl border p-3 text-start transition-colors ${
                mine ? 'border-accent' : 'border-ink-800'
              } ${isOpen ? 'hover:border-ink-600' : 'opacity-80'}`}
            >
              <span
                className="absolute inset-y-0 start-0 bg-accent/15"
                style={{ width: `${(row.count / maxCount) * 100}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{place?.name ?? '—'}</span>
                  {row.voters.length > 0 && (
                    <span className="text-xs text-ink-400">{row.voters.join(', ')}</span>
                  )}
                </span>
                <span className="shrink-0 text-lg font-semibold">{row.count}</span>
              </span>
            </button>
          )
        })}
      </div>
      {isOpen && <p className="text-xs text-ink-500">{t('poll.vote')} — {t('poll.myVote')}</p>}
    </div>
  )
}
