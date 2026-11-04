import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { MenuItem, OrderItem, SelectedOption } from '../lib/types'
import { matches } from '../lib/text'
import { money } from '../lib/format'
import { Button, Field, Input, Modal, Textarea } from './ui'

type Draft = Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>

export function AddOrderItem({
  open,
  menu,
  userId,
  userName,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean
  menu: MenuItem[]
  userId: string
  userName: string
  editing?: OrderItem | null
  onClose: () => void
  onSubmit: (draft: Draft) => Promise<void>
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'menu' | 'free'>(editing?.menuItemId ? 'menu' : 'menu')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<MenuItem | null>(null)
  const [choices, setChoices] = useState<Record<string, string[]>>({})
  const [special, setSpecial] = useState(editing?.specialRequest ?? '')
  const [freeText, setFreeText] = useState(editing?.freeText ?? '')
  const [qty, setQty] = useState(editing?.qty ?? 1)
  const [busy, setBusy] = useState(false)
  const [sessionKey, setSessionKey] = useState('')

  const key = `${open}-${editing?.id ?? 'new'}`
  if (key !== sessionKey) {
    setSessionKey(key)
    const fromMenu = editing?.menuItemId ? menu.find((m) => m.id === editing.menuItemId) ?? null : null
    setPicked(fromMenu)
    setTab(editing && !editing.menuItemId ? 'free' : 'menu')
    setSpecial(editing?.specialRequest ?? '')
    setFreeText(editing?.freeText ?? '')
    setQty(editing?.qty ?? 1)
    setQ('')
    const pre: Record<string, string[]> = {}
    if (fromMenu && editing) {
      for (const opt of fromMenu.options ?? []) {
        const sel = editing.selectedOptions?.find((s) => s.optionLabel === opt.label)
        if (sel) {
          pre[opt.id] = opt.choices
            .filter((c) => sel.choiceLabels.includes(c.label))
            .map((c) => c.id)
        }
      }
    }
    setChoices(pre)
  }

  const shown = useMemo(
    () => menu.filter((m) => m.isAvailable !== false && (matches(m.name, q) || matches(m.description ?? '', q))),
    [menu, q],
  )

  const selectedOptions: SelectedOption[] = useMemo(() => {
    if (!picked) return []
    return (picked.options ?? [])
      .map((opt) => {
        const ids = choices[opt.id] ?? []
        const sel = opt.choices.filter((c) => ids.includes(c.id))
        if (sel.length === 0) return null
        return {
          optionLabel: opt.label,
          choiceLabels: sel.map((c) => c.label),
          priceDelta: sel.reduce((s, c) => s + (c.priceDelta || 0), 0),
        }
      })
      .filter((x): x is SelectedOption => x !== null)
  }, [picked, choices])

  const unitPrice = useMemo(() => {
    if (!picked || picked.price == null) return null
    return picked.price + selectedOptions.reduce((s, o) => s + o.priceDelta, 0)
  }, [picked, selectedOptions])

  const missingRequired = useMemo(
    () =>
      (picked?.options ?? []).some((o) => o.required && (choices[o.id] ?? []).length === 0),
    [picked, choices],
  )

  function toggleChoice(optId: string, choiceId: string, type: 'single' | 'multi') {
    setChoices((prev) => {
      const cur = prev[optId] ?? []
      if (type === 'single') return { ...prev, [optId]: cur[0] === choiceId ? [] : [choiceId] }
      return {
        ...prev,
        [optId]: cur.includes(choiceId) ? cur.filter((c) => c !== choiceId) : [...cur, choiceId],
      }
    })
  }

  const canSubmit =
    tab === 'free' ? freeText.trim().length > 0 : !!picked && !missingRequired

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    try {
      const draft: Draft =
        tab === 'free'
          ? {
              userId,
              userNameSnapshot: userName,
              menuItemId: null,
              nameSnapshot: freeText.trim(),
              freeText: freeText.trim(),
              selectedOptions: [],
              specialRequest: special.trim(),
              qty,
              priceEstimate: null,
            }
          : {
              userId,
              userNameSnapshot: userName,
              menuItemId: picked!.id,
              nameSnapshot: picked!.name,
              freeText: '',
              selectedOptions,
              specialRequest: special.trim(),
              qty,
              priceEstimate: unitPrice == null ? null : unitPrice * qty,
            }
      await onSubmit(draft)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('common.edit') : t('order.addItem')}>
      <div className="flex flex-col gap-3">
        <div className="flex overflow-hidden rounded-xl border border-ink-700 text-sm">
          {(['menu', 'free'] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={`flex-1 py-2 ${tab === x ? 'bg-accent font-semibold text-ink-950' : 'text-ink-300'}`}
            >
              {x === 'menu' ? t('order.fromMenu') : t('order.freeText')}
            </button>
          ))}
        </div>

        {tab === 'menu' ? (
          <>
            {!picked ? (
              <>
                <Input
                  placeholder={t('common.search')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoFocus
                />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-800">
                  {shown.length === 0 && (
                    <div className="p-4 text-center text-sm text-ink-500">{t('menu.empty')}</div>
                  )}
                  {shown.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPicked(m)}
                      className="flex w-full items-center justify-between gap-3 border-b border-ink-800 p-3 text-start last:border-0 hover:bg-ink-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{m.name}</span>
                        {m.category && <span className="text-xs text-ink-500">{m.category}</span>}
                      </span>
                      <span className="shrink-0 text-sm text-ink-400">{money(m.price)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 rounded-xl bg-ink-800 p-3">
                  <div>
                    <div className="font-medium">{picked.name}</div>
                    <div className="text-sm text-ink-400">{money(picked.price)}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
                    ✕
                  </Button>
                </div>

                {(picked.options ?? []).map((opt) => (
                  <div key={opt.id}>
                    <div className="mb-1 text-sm text-ink-400">
                      {opt.label}
                      {opt.required && <span className="ms-1 text-red-400">*</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opt.choices.map((c) => {
                        const active = (choices[opt.id] ?? []).includes(c.id)
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleChoice(opt.id, c.id, opt.type)}
                            className={`rounded-full px-3 py-1 text-sm ${
                              active ? 'bg-accent font-medium text-ink-950' : 'bg-ink-800 text-ink-300'
                            }`}
                          >
                            {c.label}
                            {c.priceDelta ? ` +${c.priceDelta}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <Field label={t('order.freeText')} hint={t('order.freeTextPh')}>
            <Textarea
              rows={3}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              autoFocus
            />
          </Field>
        )}

        {(picked || tab === 'free') && (
          <>
            <Field label={t('order.special')}>
              <Input
                placeholder={t('order.specialPh')}
                value={special}
                onChange={(e) => setSpecial(e.target.value)}
              />
            </Field>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-400">{t('common.qty')}</span>
                <Button size="sm" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                  −
                </Button>
                <span className="w-8 text-center">{qty}</span>
                <Button size="sm" onClick={() => setQty((n) => Math.min(20, n + 1))}>
                  +
                </Button>
              </div>
              {unitPrice != null && (
                <span className="text-ink-300">{money(unitPrice * qty)}</span>
              )}
            </div>

            <Button variant="primary" size="lg" onClick={submit} disabled={busy || !canSubmit}>
              {editing ? t('common.save') : t('common.add')}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
