import { json } from '../../_lib'

/**
 * GET /api/v1/recommendations → testimonials, ordered by sort_order.
 * Mirrors the Laravel RecommendationController.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.blog_db
    .prepare('SELECT id, initials, quote, author, role, email, sort_order FROM recommendations WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC')
    .all()

  return json({ data: results })
}
