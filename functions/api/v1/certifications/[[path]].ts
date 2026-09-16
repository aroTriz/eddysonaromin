import { json } from '../../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * GET /api/v1/certifications        → all certifications, ordered by sort_order
 * GET /api/v1/certifications/{slug} → single certification by slug
 * Mirrors the Laravel CertificationController.
 */
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const segments = (params.path as string[] | undefined) ?? []

  // Single certification by slug (non-archived)
  if (segments.length > 0) {
    const slug = decodeURIComponent(segments[0])
    const row = await env.blog_db
      .prepare('SELECT * FROM certifications WHERE slug = ? AND archived_at IS NULL')
      .bind(slug)
      .first()
    if (!row) return json({ message: 'Certification not found.' }, 404)
    return json({ data: row })
  }

  const { results } = await env.blog_db
    .prepare('SELECT id, slug, title, issuer, year, category, summary, sort_order FROM certifications WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC')
    .all()
  return json({ data: results })
}
