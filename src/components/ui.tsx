import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-ink-950 hover:bg-accent-strong font-semibold',
  subtle: 'bg-ink-800 text-ink-50 hover:bg-ink-700 border border-ink-700',
  ghost: 'bg-transparent text-ink-300 hover:text-ink-50 hover:bg-ink-800',
  danger: 'bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/40',
}

export function Button({
  variant = 'subtle',
  className = '',
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'px-2.5 py-1.5 text-sm rounded-lg',
    md: 'px-3.5 py-2 rounded-xl',
    lg: 'px-5 py-3 text-lg rounded-2xl w-full',
  }
  return (
    <button
      {...rest}
      className={`${variants[variant]} ${sizes[size]} transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2 ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink-800 bg-ink-900 p-4 ${className}`}>{children}</div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm text-ink-400">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-ink-50 placeholder:text-ink-500 outline-none focus:border-accent'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${inputCls} ${className}`} />
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${inputCls} ${className}`} />
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}) {
  const base = 'rounded-full px-3 py-1 text-sm transition-colors'
  if (!onClick)
    return <span className={`${base} bg-ink-800 text-ink-300`}>{children}</span>
  return (
    <button
      onClick={onClick}
      className={`${base} ${active ? 'bg-accent text-ink-950 font-medium' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}
    >
      {children}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-ink-800 bg-ink-900 p-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-ink-400">
      <span className="size-5 animate-spin rounded-full border-2 border-ink-700 border-t-accent" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-800 p-8 text-center text-ink-400">
      {children}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-amber-400"
      />
      {label}
    </label>
  )
}
