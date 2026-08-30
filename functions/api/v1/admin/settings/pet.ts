/**
 * Admin site settings — pet config (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::updatePet.
 *
 *   POST /api/v1/admin/settings/pet
 *   Body: { enabled, globalEnabled, scale, speed, animate }
 *
 * Saves the pet config as JSON in site_settings.pet_settings.
 */

interface Env {
  blog_db: D1Database
}

const DEFAULT_PET = {
  enabled: false,
  globalEnabled: false,
  scale: 0.5,
  speed: 1,
  animate: false,
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

async function getCurrentPet(env: Env): Promise<Record<string, unknown>> {
  try {
    const row = await env.blog_db
      .prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind('pet_settings')
      .first<{ value: string }>()
    if (!row?.value) return { ...DEFAULT_PET }
    const parsed = JSON.parse(row.value) as Record<string, unknown>
    return { ...DEFAULT_PET, ...parsed }
  } catch {
    return { ...DEFAULT_PET }
  }
}

const VALID_SCALES = [0.35, 0.5, 0.65]
const VALID_SPEEDS = [0.6, 1, 1.5]

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const current = await getCurrentPet(env)

    // Merge submitted fields (only known keys, validated types)
    if (typeof body.enabled === 'boolean') current.enabled = body.enabled
    if (typeof body.globalEnabled === 'boolean') current.globalEnabled = body.globalEnabled
    if (typeof body.animate === 'boolean') current.animate = body.animate
    if (typeof body.scale === 'number' && VALID_SCALES.includes(body.scale)) current.scale = body.scale
    if (typeof body.speed === 'number' && VALID_SPEEDS.includes(body.speed)) current.speed = body.speed
    // Never auto-enable via admin: admin ON only shows toggle button; visitor toggles per-browser.
    current.enabled = false

    const now = new Date().toISOString()

    await env.blog_db
      .prepare(
        `INSERT INTO site_settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .bind('pet_settings', JSON.stringify(current), now, now)
      .run()

    return json(current)
  } catch {
    return json({ error: 'Failed to save pet settings.' }, 500)
  }
}
