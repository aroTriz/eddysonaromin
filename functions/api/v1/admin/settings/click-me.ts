/**
 * Admin site settings — click me on/off (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::updateClickMe.
 *
 *   POST /api/v1/admin/settings/click-me  body: { enabled: boolean }
 *
 * When `enabled` is true (default), the sidebar shows the "click me..."
 * button that opens the Ask Triz.ai overlay. When false, the button is hidden.
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
      .bind('click_me_enabled', enabled ? '1' : '0', now, now)
      .run()

    return json({ click_me_enabled: enabled })
  } catch {
    return json({ error: 'Failed to update settings.' }, 500)
  }
}
