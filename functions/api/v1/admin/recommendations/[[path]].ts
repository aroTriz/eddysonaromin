import { json } from '../../../../_lib'

/**
 * Recommendations CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/recommendations       â†’ all testimonials
 *   POST   /api/v1/admin/recommendations       â†’ create a testimonial
 *   GET    /api/v1/admin/recommendations/{id}  â†’ single testimonial
 *   PUT    /api/v1/admin/recommendations/{id}  â†’ update a testimonial
 *   DELETE /api/v1/admin/recommendations/{id}  â†’ delete a testimonial
 *   DELETE /api/v1/admin/recommendations/bulk  â†’ bulk delete (ids array)
 */

interface Env {
  blog_db: D1Database
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) return false

  const session = await env.blog_db
    .prepare(
      'SELECT s.id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1',
    )
    .bind(token, new Date().toISOString())
    .first()

  return session !== null
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
}

function parseIds(body: unknown): number[] {
  if (typeof body !== 'object' || body === null) return []
  const ids = (body as { ids?: unknown }).ids
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Single testimonial by id.
  if (segments.length > 0) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Recommendation not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM recommendations WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Recommendation not found.' }, 404)
    return json({ data: row })
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'
  const { results } = await env.blog_db
    .prepare(`SELECT * FROM recommendations WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY sort_order ASC, id ASC`)
    .all()
  return json({ data: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Archive / restore an existing testimonial: POST /admin/recommendations/{id}/archive|restore
  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Recommendation not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM recommendations WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Recommendation not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db
        .prepare('UPDATE recommendations SET archived_at = ?, updated_at = ? WHERE id = ?')
        .bind(archivedAt, new Date().toISOString(), id)
        .run()
      const row = await env.blog_db.prepare('SELECT * FROM recommendations WHERE id = ?').bind(id).first()
      return json({ data: row })
    }
    return json({ message: 'Not found.' }, 404)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const initials = str(body.initials, '').trim()
  const quote = str(body.quote, '').trim()
  const author = str(body.author, '').trim()
  const role = str(body.role, '').trim()

  if (!initials || !quote || !author || !role) {
    return json({ error: 'Initials, quote, author and role are required.' }, 422)
  }

  const now = new Date().toISOString()
  const result = await env.blog_db
    .prepare(
      'INSERT INTO recommendations (initials, quote, author, role, email, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(initials, quote, author, role, strOrNull(body.email), num(body.sort_order), now, now)
    .run()

  const row = await env.blog_db
    .prepare('SELECT * FROM recommendations WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return json({ data: row }, 201)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Recommendation not found.' }, 404)

  const existing = await env.blog_db.prepare('SELECT * FROM recommendations WHERE id = ?').bind(id).first()
  if (!existing) return json({ message: 'Recommendation not found.' }, 404)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const now = new Date().toISOString()
  await env.blog_db
    .prepare(
      'UPDATE recommendations SET initials = ?, quote = ?, author = ?, role = ?, email = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    )
    .bind(
      str(body.initials, String(existing.initials)),
      str(body.quote, String(existing.quote)),
      str(body.author, String(existing.author)),
      str(body.role, String(existing.role)),
      strOrNull(body.email) ?? (existing.email as string | null),
      num(body.sort_order, existing.sort_order as number),
      now,
      id,
    )
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM recommendations WHERE id = ?').bind(id).first()
  return json({ data: row })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Bulk delete: DELETE /admin/recommendations/bulk  { ids: number[] }
  if (segments[0] === 'bulk') {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const ids = parseIds(body)
    if (ids.length === 0) return json({ error: 'No valid ids provided.' }, 422)

    const placeholders = ids.map(() => '?').join(', ')
    const result = await env.blog_db
      .prepare(`DELETE FROM recommendations WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run()

    return json({ data: { deleted: result.meta.changes } })
  }

  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Recommendation not found.' }, 404)

  await env.blog_db.prepare('DELETE FROM recommendations WHERE id = ?').bind(id).run()
  return json({ success: true })
}
