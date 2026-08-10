import { json, mapPost } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * GET /api/v1/blog/posts         → published posts (newest first)
 * GET /api/v1/blog/posts/{slug}  → single published post
 * Mirrors the Laravel BlogPostController.
 */
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const segments = (params.path as string[] | undefined) ?? []

  // Single post by slug (published, not archived).
  if (segments.length > 0) {
    const slug = decodeURIComponent(segments[0])
    const row = await env.blog_db
      .prepare(
        "SELECT * FROM blog_posts WHERE slug = ? AND published_at IS NOT NULL AND archived_at IS NULL",
      )
      .bind(slug)
      .first()
    if (!row) return json({ message: 'Post not found.' }, 404)
    return json({ data: mapPost(row) })
  }

  const { results } = await env.blog_db
    .prepare('SELECT * FROM blog_posts WHERE published_at IS NOT NULL AND archived_at IS NULL ORDER BY published_at DESC')
    .all()
  return json({ data: results.map(mapPost) })
}
