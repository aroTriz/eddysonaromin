/**
 * Public site settings (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::show.
 *
 *   GET /api/v1/settings → { community_chat_enabled: boolean }
 *
 * Fail-open: a missing row or a DB hiccup reports the chat as enabled, so
 * a settings failure never silently locks the community chat.
 */

interface Env {
  blog_db: D1Database
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
      .bind('community_chat_enabled')
      .first<{ value: string }>()
    return json({ community_chat_enabled: (row?.value ?? '1') !== '0' })
  } catch {
    return json({ community_chat_enabled: true }, 500)
  }
}
