import { json, mapProject } from '../../../../_lib'

/**
 * Projects CMS for the /aromin admin area (authenticated, D1-backed).
 * Mirrors the Laravel AdminProjectController.
 *
 *   GET    /api/v1/admin/projects            → all projects (active or archived)
 *   POST   /api/v1/admin/projects            → create a project
 *   GET    /api/v1/admin/projects/{id}       → single project
 *   PUT    /api/v1/admin/projects/{id}       → update a project
 *   DELETE /api/v1/admin/projects/{id}       → delete a project
 *   DELETE /api/v1/admin/projects/bulk       → bulk delete (ids array)
 *   POST   /api/v1/admin/projects/{id}/archive|restore
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

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
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

function parseShowcase(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  try { return JSON.stringify(value) } catch { return null }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const VALID_TYPES = ['documentation', 'ai-tools', 'game', 'web-app', 'ml-data', 'ar-mobile', 'networking']
const VALID_CATEGORIES = ['personal', 'academic']

async function uniqueSlug(env: Env, title: string, ignoreId?: number): Promise<string> {
  let base = slugify(title)
  let slug = base
  let i = 2
  while (true) {
    const q = ignoreId
      ? env.blog_db.prepare('SELECT id FROM projects WHERE slug = ? AND id != ?').bind(slug, ignoreId)
      : env.blog_db.prepare('SELECT id FROM projects WHERE slug = ?').bind(slug)
    const existing = await q.first()
    if (!existing) return slug
    slug = `${base}-${i}`
    i++
  }
}

// ── GET ───────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Single project by id.
  if (segments.length > 0) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Project not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Project not found.' }, 404)
    return json({ data: mapProject(row as Record<string, unknown>) })
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'

  const { results } = await env.blog_db
    .prepare(
      `SELECT * FROM projects
       WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY sort_order ASC, year DESC`,
    )
    .all()

  return json({ data: results.map((r) => mapProject(r as Record<string, unknown>)) })
}

// ── POST ──────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Archive / restore: POST /admin/projects/{id}/archive|restore
  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Project not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Project not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db
        .prepare('UPDATE projects SET archived_at = ?, updated_at = ? WHERE id = ?')
        .bind(archivedAt, new Date().toISOString(), id)
        .run()
      const row = await env.blog_db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
      return json({ data: mapProject(row as Record<string, unknown>) })
    }
    return json({ message: 'Not found.' }, 404)
  }

  // Create project.
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const title = str(body.title).trim()
  const category = str(body.category)
  const type = str(body.type)
  const summary = str(body.summary).trim()

  if (!title) return json({ error: 'Title is required.' }, 422)
  if (!VALID_CATEGORIES.includes(category)) return json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }, 422)
  if (!VALID_TYPES.includes(type)) return json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` }, 422)
  if (!summary) return json({ error: 'Summary is required.' }, 422)

  const now = new Date().toISOString()
  const slug = await uniqueSlug(env, title)
  const technologies = JSON.stringify(parseJsonArray(body.technologies))
  const showcase = parseShowcase(body.showcase)

  const result = await env.blog_db
    .prepare(
      `INSERT INTO projects
       (title, slug, category, type, summary, tagline, description, role, year,
        featured, technologies, url, source_url, image_url, favicon_url, showcase,
        sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      title, slug, category, type, summary,
      strOrNull(body.tagline),
      strOrNull(body.description),
      strOrNull(body.role),
      strOrNull(body.year),
      bool(body.featured) ? 1 : 0,
      technologies,
      strOrNull(body.url),
      strOrNull(body.source_url),
      strOrNull(body.image_url),
      strOrNull(body.favicon_url),
      showcase,
      num(body.sort_order),
      now, now,
    )
    .run()

  const row = await env.blog_db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return json({ data: mapProject(row as Record<string, unknown>) }, 201)
}

// ── PUT ───────────────────────────────────────────────────────────

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Project not found.' }, 404)

  const existing = await env.blog_db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
  if (!existing) return json({ message: 'Project not found.' }, 404)

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const now = new Date().toISOString()
  const title = 'title' in body ? str(body.title, String(existing.title)).trim() : String(existing.title)
  const slug = 'title' in body && title !== String(existing.title)
    ? await uniqueSlug(env, title, id)
    : String(existing.slug)

  await env.blog_db
    .prepare(
      `UPDATE projects SET
        title = ?, slug = ?, category = ?, type = ?, summary = ?,
        tagline = ?, description = ?, role = ?, year = ?,
        featured = ?, technologies = ?, url = ?, source_url = ?,
        image_url = ?, favicon_url = ?, showcase = ?,
        sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      title,
      slug,
      'category' in body ? str(body.category, String(existing.category)) : existing.category,
      'type' in body ? str(body.type, String(existing.type)) : existing.type,
      'summary' in body ? str(body.summary, String(existing.summary)) : existing.summary,
      'tagline' in body ? strOrNull(body.tagline) : existing.tagline,
      'description' in body ? strOrNull(body.description) : existing.description,
      'role' in body ? strOrNull(body.role) : existing.role,
      'year' in body ? strOrNull(body.year) : existing.year,
      'featured' in body ? (bool(body.featured) ? 1 : 0) : existing.featured,
      'technologies' in body ? JSON.stringify(parseJsonArray(body.technologies)) : existing.technologies,
      'url' in body ? strOrNull(body.url) : existing.url,
      'source_url' in body ? strOrNull(body.source_url) : existing.source_url,
      'image_url' in body ? strOrNull(body.image_url) : existing.image_url,
      'favicon_url' in body ? strOrNull(body.favicon_url) : existing.favicon_url,
      'showcase' in body ? parseShowcase(body.showcase) : existing.showcase,
      'sort_order' in body ? num(body.sort_order, existing.sort_order as number) : existing.sort_order,
      now,
      id,
    )
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
  return json({ data: mapProject(row as Record<string, unknown>) })
}

// ── DELETE ────────────────────────────────────────────────────────

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Bulk delete: DELETE /admin/projects/bulk  { ids: number[] }
  if (segments[0] === 'bulk') {
    let body: unknown
    try { body = await request.json() } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const ids = parseIds(body)
    if (ids.length === 0) return json({ error: 'No valid ids provided.' }, 422)
    const placeholders = ids.map(() => '?').join(', ')
    const result = await env.blog_db
      .prepare(`DELETE FROM projects WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run()
    return json({ data: { deleted: result.meta.changes } })
  }

  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Project not found.' }, 404)

  await env.blog_db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return json({ success: true })
}
