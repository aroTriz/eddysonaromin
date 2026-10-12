import type { Project } from '@/types'

/**
 * Human-friendly labels for project types, matching the reference site's
 * category naming ("AI / Tools", "AR / Mobile", "ML / Data", ...).
 */
const TYPE_LABELS: Record<Project['type'], string> = {
  documentation: 'Documentation',
  'ai-tools': 'AI / Tools',
  game: 'Game',
  'web-app': 'Web App',
  'ml-data': 'ML / Data',
  'ar-mobile': 'AR / Mobile',
  networking: 'Networking',
}

/** Normalize a project type slug into its display label. */
export function projectTypeLabel(type: Project['type']): string {
  return TYPE_LABELS[type] ?? kebabToTitleCase(type)
}

// ── Case rules ───────────────────────────────────────────────────
// Single source of truth for display casing. Slugs (`ai-tools`,
// `blog_post`) become `Ai Tools`-style titles; plain words are
// capitalized. Always use these instead of ad-hoc replace/capitalize.

/** Uppercase the first letter, leave the rest untouched. */
export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** `ai-tools` → `Ai Tools`. Handles `-`, `_` and extra whitespace. */
export function kebabToTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => capitalize(word.toLowerCase()))
    .join(' ')
}

/** Any-case input → `Title Case With Spaces`. */
export function toTitleCase(value: string): string {
  return kebabToTitleCase(value.trim())
}

/** `My Title!` → `my-title` (max 60 chars). Shared by every CMS editor. */
export function slugify(input: string, maxLength = 60): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
}

/** Short admin date: `Jan 5, 2026`. Returns `—` when empty. */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Blog reading time & relative timestamps ──────────────────────

const WORDS_PER_MINUTE = 200

/**
 * Estimate reading time from word count (~200 wpm).
 * Returns e.g. "1 min" / "4 min". Always at least 1 minute.
 */
export function readingTime(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return `${minutes} min`
}

/**
 * Human "time ago" from an ISO timestamp, relative to `now` (defaults to
 * the current time). Scales: just now → min → hr → days → falls back to a
 * short date past 30 days so cards stay readable.
 */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const diffMs = now.getTime() - then
  const abs = Math.abs(diffMs)
  const isFuture = diffMs < 0
  const seconds = Math.floor(abs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const suffix = isFuture ? ' from now' : ' ago'

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min${suffix}`
  if (hours < 24) return `${hours} hr${suffix}`
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}${suffix}`

  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Compact visit count for the sidebar presence line — must stay tiny so it
 * fits beside "N person viewing now" on one line.
 * 999 → "999", 1000 → "1k+", 2500 → "2k+", 999999 → "999k+",
 * 1000000 → "1M+", 2500000 → "2M+". Always floors, always "+" when shortened.
 */
export function formatCompactVisits(n: number): string {
  const v = Math.max(0, Math.floor(n))
  if (v < 1000) return String(v)
  if (v < 1_000_000) return `${Math.floor(v / 1000)}k+`
  return `${Math.floor(v / 1_000_000)}M+`
}

/**
 * "Edited X ago" label — shown when a post was updated after publishing.
 * Returns '' when there is no meaningful edit (same as published, or null).
 */
export function editedLabel(publishedAt: string | null, updatedAt: string | null, now: Date = new Date()): string {
  if (!publishedAt || !updatedAt) return ''
  const p = new Date(publishedAt).getTime()
  const u = new Date(updatedAt).getTime()
  if (Number.isNaN(p) || Number.isNaN(u) || u - p < 60_000) return ''
  return `edited ${timeAgo(updatedAt, now)}`
}
