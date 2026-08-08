/**
 * GET  /api/v1/auth/session — validate a Bearer token (returns admin info).
 * POST /api/v1/auth/logout  — delete the session token.
 * Mirrors the previous projects' `session.ts`.
 */

interface Env {
  blog_db: D1Database
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (request.method === 'GET') {
    const session = await env.blog_db
      .prepare(
        'SELECT s.admin_id, a.username FROM admin_sessions s JOIN admins a ON s.admin_id = a.id WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1',
      )
      .bind(token, new Date().toISOString())
      .first<{ admin_id: number; username: string }>()

    if (!session) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ authenticated: true, admin: { id: session.admin_id, username: session.username } }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (request.method === 'POST') {
    await env.blog_db.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run()
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}
