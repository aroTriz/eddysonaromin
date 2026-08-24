/**
 * Public pet config (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::pet.
 *
 *   GET /api/v1/settings/pet → { enabled, globalEnabled, scale, speed, animate }
 *
 * Fail-open: returns defaults when the row is missing or the DB hiccups.
 */

interface Env {
  blog_db: D1Database
}

const DEFAULT_PET = {
  enabled: false,
  globalEnabled: true,
  scale: 0.5,
  speed: 1,
  animate: true,
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const row = await env.blog_db
      .prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind('pet_settings')
      .first<{ value: string }>()

    if (!row?.value) return json(DEFAULT_PET)

    const parsed = JSON.parse(row.value) as Record<string, unknown>
    return json({ ...DEFAULT_PET, ...parsed })
  } catch {
    return json(DEFAULT_PET)
  }
}
