import { json } from '../../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * GET /api/v1/references        → all references, ordered by sort_order
 * GET /api/v1/references/{slug} → single reference by slug
 * Mirrors the Laravel ReferenceController.
 */
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const segments = (params.path as string[] | undefined) ?? []

  // Single reference by slug (non-archived)
  if (segments.length > 0) {
    const slug = decodeURIComponent(segments[0])
    const row = await env.blog_db
      .prepare('SELECT * FROM `references` WHERE slug = ? AND archived_at IS NULL')
      .bind(slug)
      .first()
    if (!row) return json({ message: 'Reference not found.' }, 404)
    return json({ data: row })
  }

  const { results } = await env.blog_db
    .prepare('SELECT id, slug, initials, name, title, email, photo_url, summary, sort_order FROM `references` WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC')
    .all()
  return json({ data: results })
}
