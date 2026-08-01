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
  return TYPE_LABELS[type] ?? type.replace('-', ' ')
}

/** Normalize a category slug ("personal" -> "Personal"). */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
