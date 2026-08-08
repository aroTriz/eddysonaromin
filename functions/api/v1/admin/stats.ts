/**
 * GET /api/v1/admin/stats — dashboard stats (visitors, posts, projects, messages).
 * Requires a valid admin Bearer token.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const session = await env.blog_db
    .prepare(
      'SELECT s.admin_id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1',
    )
    .bind(token, new Date().toISOString())
    .first<{ admin_id: number }>()

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const visitor = await env.blog_db
    .prepare('SELECT count FROM visitors WHERE site = ?')
    .bind('portfolio')
    .first<{ count: number }>()
  const posts = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM blog_posts').first<{ n: number }>()
  const projects = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM projects').first<{ n: number }>()
  const messages = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM contact_messages').first<{ n: number }>()

  return new Response(
    JSON.stringify({
      data: {
        visitors: visitor?.count ?? 0,
        posts: posts?.n ?? 0,
        projects: projects?.n ?? 0,
        messages: messages?.n ?? 0,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
