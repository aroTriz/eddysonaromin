import { json } from '../../_lib'

/**
 * GET /api/v1/stack → tech stack categories, ordered by sort_order.
 * Mirrors the Laravel StackController.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.blog_db
    .prepare('SELECT id, label, items, sort_order FROM stack_groups WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC')
    .all<Record<string, unknown>>()

  const data = results.map((row) => ({
    ...row,
    items: row.items ? JSON.parse(String(row.items)) : [],
  }))

  return json({ data })
}
