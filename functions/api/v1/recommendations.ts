import { json } from '../../_lib'

/**
 * GET /api/v1/recommendations â†’ testimonials, ordered by sort_order.
 * Mirrors the Laravel RecommendationController.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.blog_db
    .prepare('SELECT id, initials, quote, author, role, email, phone, photo_url, letter_url, sort_order FROM recommendations WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC')
    .all()

  return json({ data: results })
}

