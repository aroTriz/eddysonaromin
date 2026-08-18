import { json } from '../../../../_lib'

/**
 * Experiences CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/experiences            → all entries (active or archived)
 *   POST   /api/v1/admin/experiences            → create entry
 *   GET    /api/v1/admin/experiences/{id}       → single entry
 *   PUT    /api/v1/admin/experiences/{id}       → update entry
 *   DELETE /api/v1/admin/experiences/{id}       → delete entry
 *   DELETE /api/v1/admin/experiences/bulk       → bulk delete (ids array)
 *   POST   /api/v1/admin/experiences/{id}/archive|restore
 *   POST   /api/v1/admin/experiences/upload     → upload image (logo, album, cert)
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

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((v: unknown): v is string => typeof v === 'string') : []
    } catch { return [] }
  }
  return []
}

function parseIds(body: unknown): number[] {
  if (typeof body !== 'object' || body === null) return []
  const ids = (body as { ids?: unknown }).ids
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
}

/** Shape a row for the frontend — parse JSON columns. */
function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    albums: row.albums ? JSON.parse(String(row.albums)) : [],
    certificates: row.certificates ? JSON.parse(String(row.certificates)) : [],
    highlights: row.highlights ? JSON.parse(String(row.highlights)) : [],
  }
}

// ── GET ───────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Single entry by id.
  if (segments.length > 0) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Experience not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM experiences WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Experience not found.' }, 404)
    return json({ data: mapRow(row as Record<string, unknown>) })
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'
  const { results } = await env.blog_db
    .prepare(
      `SELECT * FROM experiences
       WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY
         CASE type WHEN 'experience' THEN 0 WHEN 'education' THEN 1 END,
         sort_order ASC,
         id ASC`,
    )
    .all()

  return json({ data: results.map((r) => mapRow(r as Record<string, unknown>)) })
}

// ── POST ──────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Archive / restore: POST /admin/experiences/{id}/archive|restore
  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Experience not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM experiences WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Experience not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db
        .prepare('UPDATE experiences SET archived_at = ?, updated_at = ? WHERE id = ?')
        .bind(archivedAt, new Date().toISOString(), id)
        .run()
      const row = await env.blog_db.prepare('SELECT * FROM experiences WHERE id = ?').bind(id).first()
      return json({ data: mapRow(row as Record<string, unknown>) })
    }
    return json({ message: 'Not found.' }, 404)
  }

  // Upload image: POST /admin/experiences/upload  { image: "data:image/..." }
  if (segments.length === 1 && segments[0] === 'upload') {
    let body: Record<string, unknown>
    try { body = (await request.json()) as Record<string, unknown> } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const imageData = str(body.image)
    if (!imageData || !imageData.startsWith('data:image/')) {
      return json({ error: 'Invalid image data. Expected a base64 data-URL.' }, 422)
    }
    // Basic size check: data-URLs over ~4MB base64 (~3MB decoded) are rejected
    if (imageData.length > 5_500_000) {
      return json({ error: 'Image too large. Max ~3 MB decoded.' }, 422)
    }
    return json({ data: { url: imageData } })
  }

  // Create entry.
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const type = str(body.type, 'experience')
  if (type !== 'experience' && type !== 'education') {
    return json({ error: 'Type must be "experience" or "education".' }, 422)
  }

  const period = str(body.period).trim()
  const year = str(body.year).trim()
  const tag = str(body.tag).trim()
  const title = str(body.title).trim()
  const company = str(body.company).trim()
  const description = str(body.description).trim()

  if (!period || !year || !tag || !title || !company) {
    return json({ error: 'Period, year, tag, title, and company/school are required.' }, 422)
  }

  const now = new Date().toISOString()
  const albums = JSON.stringify(parseJsonArray(body.albums))
  const certificates = JSON.stringify(parseJsonArray(body.certificates))
  const highlights = JSON.stringify(parseJsonArray(body.highlights))

  const result = await env.blog_db
    .prepare(
      `INSERT INTO experiences
       (type, period, year, tag, title, company, logo_url, website_url, tooltip_desc,
        albums, certificates, description, highlights, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      type, period, year, tag, title, company,
      strOrNull(body.logo_url),
      strOrNull(body.website_url),
      strOrNull(body.tooltip_desc),
      albums, certificates, description, highlights,
      num(body.sort_order),
      now, now,
    )
    .run()

  const row = await env.blog_db
    .prepare('SELECT * FROM experiences WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return json({ data: mapRow(row as Record<string, unknown>) }, 201)
}

// ── PUT ───────────────────────────────────────────────────────────

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Experience not found.' }, 404)

  const existing = await env.blog_db.prepare('SELECT * FROM experiences WHERE id = ?').bind(id).first()
  if (!existing) return json({ message: 'Experience not found.' }, 404)

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const now = new Date().toISOString()

  await env.blog_db
    .prepare(
      `UPDATE experiences SET
        type = ?, period = ?, year = ?, tag = ?, title = ?, company = ?,
        logo_url = ?, website_url = ?, tooltip_desc = ?,
        albums = ?, certificates = ?, description = ?, highlights = ?,
        sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      str(body.type, String(existing.type)),
      str(body.period, String(existing.period)),
      str(body.year, String(existing.year)),
      str(body.tag, String(existing.tag)),
      str(body.title, String(existing.title)),
      str(body.company, String(existing.company)),
      'logo_url' in body ? strOrNull(body.logo_url) : existing.logo_url,
      'website_url' in body ? strOrNull(body.website_url) : existing.website_url,
      'tooltip_desc' in body ? strOrNull(body.tooltip_desc) : existing.tooltip_desc,
      'albums' in body ? JSON.stringify(parseJsonArray(body.albums)) : existing.albums,
      'certificates' in body ? JSON.stringify(parseJsonArray(body.certificates)) : existing.certificates,
      'description' in body ? str(body.description, String(existing.description)) : existing.description,
      'highlights' in body ? JSON.stringify(parseJsonArray(body.highlights)) : existing.highlights,
      'sort_order' in body ? num(body.sort_order, existing.sort_order as number) : existing.sort_order,
      now,
      id,
    )
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM experiences WHERE id = ?').bind(id).first()
  return json({ data: mapRow(row as Record<string, unknown>) })
}

// ── DELETE ────────────────────────────────────────────────────────

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Bulk delete: DELETE /admin/experiences/bulk  { ids: number[] }
  if (segments[0] === 'bulk') {
    let body: unknown
    try { body = await request.json() } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const ids = parseIds(body)
    if (ids.length === 0) return json({ error: 'No valid ids provided.' }, 422)
    const placeholders = ids.map(() => '?').join(', ')
    const result = await env.blog_db
      .prepare(`DELETE FROM experiences WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run()
    return json({ data: { deleted: result.meta.changes } })
  }

  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Experience not found.' }, 404)

  await env.blog_db.prepare('DELETE FROM experiences WHERE id = ?').bind(id).run()
  return json({ success: true })
}
