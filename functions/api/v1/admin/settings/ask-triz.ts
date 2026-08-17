/**
 * Admin site settings — Ask Triz.ai enable/disable (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::updateAskTriz.
 *
 *   POST /api/v1/admin/settings/ask-triz  body: { enabled: boolean }
 *
 * When `enabled` is true (default), the sidebar shows "Ask Triz.ai"
 * and the AI chat is active. When false, the sidebar shows "Eddyson
 * Disabled Trizai" and the chat is disabled.
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

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) return false
  const session = await env.blog_db
    .prepare('SELECT s.id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1')
    .bind(token, new Date().toISOString())
    .first()
  return session !== null
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const enabled = Boolean(body.enabled)
    const now = new Date().toISOString()

    await env.blog_db
      .prepare(
        `INSERT INTO site_settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .bind('ask_triz_enabled', enabled ? '1' : '0', now, now)
      .run()

    return json({ ask_triz_enabled: enabled })
  } catch {
    return json({ error: 'Failed to update settings.' }, 500)
  }
}
