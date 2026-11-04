import { useState } from 'react'
import { useI18n } from '../i18n'
import type { MenuItem, MenuOption } from '../lib/types'
import { newId } from '../lib/text'
import { Button, Field, Input, Modal, Textarea, Toggle } from './ui'

export interface MenuDraft {
  name: string
  description: string
  price: number | null
  category: string
  isAvailable: boolean
  options: MenuOption[]
}

export function draftFrom(item?: MenuItem | null): MenuDraft {
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price ?? null,
    category: item?.category ?? '',
    isAvailable: item?.isAvailable ?? true,
    options: item?.options ? structuredClone(item.options) : [],
  }
}

export function MenuItemEditor({
  open,
  item,
  categories,
  onClose,
  onSave,
}: {
  open: boolean
  item?: MenuItem | null
  categories: string[]
  onClose: () => void
  onSave: (draft: MenuDraft) => Promise<void>
}) {
  const { t } = useI18n()
  const [d, setD] = useState<MenuDraft>(() => draftFrom(item))
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState('')

  // re-seed the form when a different item is opened
  const openKey = `${open}-${item?.id ?? 'new'}`
  if (openKey !== key) {
    setKey(openKey)
    setD(draftFrom(item))
  }

  function patch(p: Partial<MenuDraft>) {
    setD((prev) => ({ ...prev, ...p }))
  }

  function addOption() {
    patch({
      options: [
        ...d.options,
        { id: newId(), label: '', type: 'single', required: false, choices: [] },
      ],
    })
  }

  function updOption(id: string, p: Partial<MenuOption>) {
    patch({ options: d.options.map((o) => (o.id === id ? { ...o, ...p } : o)) })
  }

  function dropOption(id: string) {
    patch({ options: d.options.filter((o) => o.id !== id) })
  }

  async function save() {
    if (!d.name.trim()) return
    setBusy(true)
    try {
      await onSave({ ...d, name: d.name.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? t('common.edit') : t('menu.add')}>
      <div className="flex flex-col gap-3">
        <Field label={t('common.name')}>
          <Input value={d.name} onChange={(e) => patch({ name: e.target.value })} autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.price')} hint={t('menu.priceHint')}>
            <Input
              type="number"
              inputMode="decimal"
              value={d.price ?? ''}
              onChange={(e) => patch({ price: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label={t('common.category')}>
            <Input
              list="menu-categories"
              value={d.category}
              onChange={(e) => patch({ category: e.target.value })}
            />
            <datalist id="menu-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label={t('common.description')}>
          <Textarea
            rows={2}
            value={d.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <Toggle
          checked={!d.isAvailable}
          onChange={(v) => patch({ isAvailable: !v })}
          label={t('menu.unavailable')}
        />

        <details className="rounded-xl border border-ink-800 p-3" open={d.options.length > 0}>
          <summary className="cursor-pointer text-sm text-ink-300">
            {t('menu.options')} {d.options.length > 0 && `(${d.options.length})`}
          </summary>

          <div className="mt-3 flex flex-col gap-3">
            {d.options.map((o) => (
              <div key={o.id} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t('menu.optionLabelPh')}
                    value={o.label}
                    onChange={(e) => updOption(o.id, { label: e.target.value })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => dropOption(o.id)}>
                    ✕
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={o.type}
                    onChange={(e) => updOption(o.id, { type: e.target.value as 'single' | 'multi' })}
                    className="rounded-lg border border-ink-700 bg-ink-950 px-2 py-1"
                  >
                    <option value="single">{t('menu.single')}</option>
                    <option value="multi">{t('menu.multi')}</option>
                  </select>
                  <Toggle
                    checked={o.required}
                    onChange={(v) => updOption(o.id, { required: v })}
                    label={t('menu.required')}
                  />
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  {o.choices.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Input
                        placeholder={t('menu.choicePh')}
                        value={c.label}
                        onChange={(e) =>
                          updOption(o.id, {
                            choices: o.choices.map((x) =>
                              x.id === c.id ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-24"
                        placeholder="+₪"
                        value={c.priceDelta || ''}
                        onChange={(e) =>
                          updOption(o.id, {
                            choices: o.choices.map((x) =>
                              x.id === c.id ? { ...x, priceDelta: Number(e.target.value) || 0 } : x,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updOption(o.id, { choices: o.choices.filter((x) => x.id !== c.id) })
                        }
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={() =>
                      updOption(o.id, {
                        choices: [...o.choices, { id: newId(), label: '', priceDelta: 0 }],
                      })
                    }
                  >
                    + {t('menu.choiceAdd')}
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" onClick={addOption}>
              + {t('menu.optionAdd')}
            </Button>
          </div>
        </details>

        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={busy || !d.name.trim()}>
            {t('common.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
