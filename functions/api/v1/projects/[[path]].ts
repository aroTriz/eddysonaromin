import { json, mapProject } from '../../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * GET /api/v1/projects            → list, filterable by category/type/featured
 * GET /api/v1/projects/{slug}     → single project
 * Mirrors the Laravel ProjectController.
 */
export const onRequestGet: PagesFunction<Env> = async ({
  request,
  params,
  env,
}) => {
  const segments = (params.path as string[] | undefined) ?? []

  // Single project by slug.
  if (segments.length > 0) {
    const slug = decodeURIComponent(segments[0])
    const row = await env.blog_db
      .prepare('SELECT * FROM projects WHERE slug = ?')
      .bind(slug)
      .first()
    if (!row) return json({ message: 'Project not found.' }, 404)
    return json({ data: mapProject(row) })
  }

  // List with optional filters.
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const type = url.searchParams.get('type')
  const featured = url.searchParams.get('featured')

  const where: string[] = []
  const binds: string[] = []
  if (category) {
    where.push('category = ?')
    binds.push(category)
  }
  if (type) {
    where.push('type = ?')
    binds.push(type)
  }
  if (featured === '1') where.push('featured = 1')

  const sql =
    'SELECT * FROM projects' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY sort_order ASC, year DESC'

  const { results } = await env.blog_db.prepare(sql).bind(...binds).all()
  return json({ data: results.map(mapProject) })
}
