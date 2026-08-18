import { json } from '../../_lib'

/**
 * GET /api/v1/experiences — public endpoint for experience + education entries.
 * Returns both types sorted by sort_order, filtered to non-archived.
 * No auth required.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.blog_db
    .prepare(
      `SELECT * FROM experiences
       WHERE archived_at IS NULL
       ORDER BY
         CASE type WHEN 'experience' THEN 0 WHEN 'education' THEN 1 END,
         sort_order ASC,
         id ASC`,
    )
    .all()

  const data = results.map((row) => ({
    ...row,
    albums: row.albums ? JSON.parse(String(row.albums)) : [],
    certificates: row.certificates ? JSON.parse(String(row.certificates)) : [],
    highlights: row.highlights ? JSON.parse(String(row.highlights)) : [],
  }))

  return json({ data })
}
