import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | Date | null | undefined, style: 'long' | 'short' = 'long') {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T12:00:00` : value) : value
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  })
}

const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function formatRelative(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'agora'
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 604800) return relativeFormatter.format(Math.round(seconds / 86400), 'day')
  return formatDate(date, 'short') ?? ''
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function safeRedirectPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
