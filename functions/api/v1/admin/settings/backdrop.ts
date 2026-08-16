/**
 * Admin site settings — backdrop on/off (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::updateBackdrop.
 *
 *   POST /api/v1/admin/settings/backdrop  body: { enabled: boolean }
 *
 * When `enabled` is false the site renders PURE backgrounds — plain white
 * in light mode, plain near-black in dark — with no neural-link animation
 * and no star sphere. When true (default) the animated backdrops return.
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
      .bind('backdrop_enabled', enabled ? '1' : '0', now, now)
      .run()

    return json({ backdrop_enabled: enabled })
  } catch {
    return json({ error: 'Failed to update settings.' }, 500)
  }
}
