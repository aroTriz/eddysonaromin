import { json } from '../../../../_lib'

/**
 * Certifications CMS for the /aromin admin area (authenticated).
 * Mirrors the Laravel AdminCertificationController.
 *
 *   GET    /api/v1/admin/certifications       → all (active or archived)
 *   POST   /api/v1/admin/certifications       → create
 *   GET    /api/v1/admin/certifications/{id}  → single
 *   PUT    /api/v1/admin/certifications/{id}  → update
 *   DELETE /api/v1/admin/certifications/{id}  → delete
 *   DELETE /api/v1/admin/certifications/bulk  → bulk delete
 *   POST   /api/v1/admin/certifications/{id}/archive|restore
 */

interface Env {
  blog_db: D1Database
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
function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []
  if (segments.length > 0 && segments[0] !== 'bulk') {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Certification not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM certifications WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Certification not found.' }, 404)
    return json({ data: row })
  }
  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'
  const { results } = await env.blog_db
    .prepare(`SELECT * FROM certifications WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY sort_order ASC, id ASC`)
    .all()
  return json({ data: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []

  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Certification not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM certifications WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Certification not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db.prepare('UPDATE certifications SET archived_at = ?, updated_at = ? WHERE id = ?').bind(archivedAt, new Date().toISOString(), id).run()
      const row = await env.blog_db.prepare('SELECT * FROM certifications WHERE id = ?').bind(id).first()
      return json({ data: row })
    }
    return json({ message: 'Not found.' }, 404)
  }

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }

  const title = str(body.title, '').trim()
  const issuer = str(body.issuer, '').trim()
  const year = str(body.year, '').trim()
  const category = str(body.category, 'certification').trim() as 'degree' | 'certification'
  if (!title || !issuer || !year) return json({ error: 'Title, issuer and year are required.' }, 422)
  if (category !== 'degree' && category !== 'certification') return json({ error: 'Invalid category.' }, 422)

  let slug = str(body.slug, '').trim()
  if (!slug) slug = slugify(title)
  else if (!/^[a-z0-9-]+$/.test(slug)) return json({ error: 'Invalid slug.' }, 422)
  const base = slug
  let i = 2
  while (await env.blog_db.prepare('SELECT id FROM certifications WHERE slug = ?').bind(slug).first()) {
    slug = `${base}-${i++}`
  }

  const now = new Date().toISOString()
  const result = await env.blog_db
    .prepare('INSERT INTO certifications (slug, title, issuer, year, category, summary, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(slug, title, issuer, year, category, strOrNull(body.summary), num(body.sort_order), now, now)
    .run()
  const row = await env.blog_db.prepare('SELECT * FROM certifications WHERE id = ?').bind(result.meta.last_row_id).first()
  return json({ data: row }, 201)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Certification not found.' }, 404)
  const existing = await env.blog_db.prepare('SELECT * FROM certifications WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!existing) return json({ message: 'Certification not found.' }, 404)

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: unknown[] = []

  if (body.slug !== undefined) {
    const s = str(body.slug, '').trim()
    if (s && !/^[a-z0-9-]+$/.test(s)) return json({ error: 'Invalid slug.' }, 422)
    if (s) { fields.push('slug = ?'); values.push(s) }
  }
  if (body.title !== undefined) { fields.push('title = ?'); values.push(str(body.title, String(existing.title))) }
  if (body.issuer !== undefined) { fields.push('issuer = ?'); values.push(str(body.issuer, String(existing.issuer))) }
  if (body.year !== undefined) { fields.push('year = ?'); values.push(str(body.year, String(existing.year))) }
  if (body.category !== undefined) {
    const cat = str(body.category, String(existing.category))
    if (cat !== 'degree' && cat !== 'certification') return json({ error: 'Invalid category.' }, 422)
    fields.push('category = ?'); values.push(cat)
  }
  if (body.summary !== undefined) { fields.push('summary = ?'); values.push(strOrNull(body.summary)) }
  if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(num(body.sort_order, existing.sort_order as number)) }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  if (fields.length > 1) {
    await env.blog_db.prepare(`UPDATE certifications SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  }
  const row = await env.blog_db.prepare('SELECT * FROM certifications WHERE id = ?').bind(id).first()
  return json({ data: row })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []
  if (segments[0] === 'bulk') {
    let body: unknown
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON body.' }, 400) }
    const ids = parseIds(body)
    if (ids.length === 0) return json({ error: 'No valid ids provided.' }, 422)
    const placeholders = ids.map(() => '?').join(', ')
    const result = await env.blog_db.prepare(`DELETE FROM certifications WHERE id IN (${placeholders})`).bind(...ids).run()
    return json({ data: { deleted: result.meta.changes } })
  }
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Certification not found.' }, 404)
  await env.blog_db.prepare('DELETE FROM certifications WHERE id = ?').bind(id).run()
  return json({ success: true })
}
