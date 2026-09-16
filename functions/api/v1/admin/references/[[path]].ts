import { json } from '../../../../_lib'

/**
 * References CMS for the /aromin admin area (authenticated).
 * Mirrors the Laravel AdminReferenceController.
 *
 *   GET    /api/v1/admin/references       → all references (active or archived)
 *   POST   /api/v1/admin/references       → create a reference
 *   GET    /api/v1/admin/references/{id}  → single reference
 *   PUT    /api/v1/admin/references/{id}  → update a reference
 *   DELETE /api/v1/admin/references/{id}  → delete a reference
 *   DELETE /api/v1/admin/references/bulk  → bulk delete (ids array)
 *   POST   /api/v1/admin/references/{id}/archive|restore
 *   POST   /api/v1/admin/references/upload  → { image: data:image/... } → { url }
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
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []

  if (segments.length > 0 && segments[0] !== 'bulk') {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Reference not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM `references` WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Reference not found.' }, 404)
    return json({ data: row })
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'
  const { results } = await env.blog_db
    .prepare(`SELECT * FROM \`references\` WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY sort_order ASC, id ASC`)
    .all()
  return json({ data: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []

  // Upload: POST /admin/references/upload  { image: data:image/... }
  if (segments[0] === 'upload') {
    let body: Record<string, unknown>
    try { body = (await request.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }
    const image = str(body.image, '')
    if (!image.startsWith('data:image/')) return json({ error: 'Invalid image data. Expected a base64 data-URL.' }, 422)
    if (image.length > 5_500_000) return json({ error: 'Image too large. Max ~3 MB decoded.' }, 422)
    return json({ data: { url: image } })
  }

  // Archive / restore
  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Reference not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM `references` WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Reference not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db.prepare('UPDATE `references` SET archived_at = ?, updated_at = ? WHERE id = ?').bind(archivedAt, new Date().toISOString(), id).run()
      const row = await env.blog_db.prepare('SELECT * FROM `references` WHERE id = ?').bind(id).first()
      return json({ data: row })
    }
    return json({ message: 'Not found.' }, 404)
  }

  // Create
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }

  const initials = str(body.initials, '').trim()
  const name = str(body.name, '').trim()
  const title = str(body.title, '').trim()
  if (!initials || !name || !title) return json({ error: 'Initials, name and title are required.' }, 422)

  let slug = str(body.slug, '').trim()
  if (!slug) slug = slugify(name)
  else {
    if (!/^[a-z0-9-]+$/.test(slug)) return json({ error: 'Invalid slug.' }, 422)
  }
  // Ensure uniqueness
  const base = slug
  let i = 2
  while (await env.blog_db.prepare('SELECT id FROM `references` WHERE slug = ?').bind(slug).first()) {
    slug = `${base}-${i++}`
  }

  const now = new Date().toISOString()
  const result = await env.blog_db
    .prepare('INSERT INTO `references` (slug, initials, name, title, email, photo_url, summary, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(slug, initials, name, title, strOrNull(body.email), strOrNull(body.photo_url), strOrNull(body.summary), num(body.sort_order), now, now)
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM `references` WHERE id = ?').bind(result.meta.last_row_id).first()
  return json({ data: row }, 201)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Reference not found.' }, 404)
  const existing = await env.blog_db.prepare('SELECT * FROM `references` WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!existing) return json({ message: 'Reference not found.' }, 404)

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }

  const now = new Date().toISOString()
  // Build dynamic update
  const fields: string[] = []
  const values: unknown[] = []

  if (body.slug !== undefined) {
    const s = str(body.slug, '').trim()
    if (s && !/^[a-z0-9-]+$/.test(s)) return json({ error: 'Invalid slug.' }, 422)
    if (s) { fields.push('slug = ?'); values.push(s) }
  }
  if (body.initials !== undefined) { fields.push('initials = ?'); values.push(str(body.initials, String(existing.initials))) }
  if (body.name !== undefined) { fields.push('name = ?'); values.push(str(body.name, String(existing.name))) }
  if (body.title !== undefined) { fields.push('title = ?'); values.push(str(body.title, String(existing.title))) }
  if (body.email !== undefined) { fields.push('email = ?'); values.push(strOrNull(body.email)) }
  if (body.photo_url !== undefined) { fields.push('photo_url = ?'); values.push(strOrNull(body.photo_url)) }
  if (body.summary !== undefined) { fields.push('summary = ?'); values.push(strOrNull(body.summary)) }
  if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(num(body.sort_order, existing.sort_order as number)) }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  if (fields.length > 1) {
    await env.blog_db.prepare(`UPDATE \`references\` SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  }

  const row = await env.blog_db.prepare('SELECT * FROM `references` WHERE id = ?').bind(id).first()
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
    const result = await env.blog_db.prepare(`DELETE FROM \`references\` WHERE id IN (${placeholders})`).bind(...ids).run()
    return json({ data: { deleted: result.meta.changes } })
  }

  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Reference not found.' }, 404)
  await env.blog_db.prepare('DELETE FROM `references` WHERE id = ?').bind(id).run()
  return json({ success: true })
}
