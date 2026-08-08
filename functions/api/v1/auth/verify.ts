/**
 * POST /api/v1/auth/verify — validate the 6-digit OTP and issue a session token.
 * Mirrors the previous projects' `verify.ts`.
 */

interface Env {
  blog_db: D1Database
}

const SESSION_TTL_MINUTES = 60 * 24 * 7 // 7 days

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { username?: string; otp?: string }
    const { username, otp } = body

    if (!username || !otp || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const admin = await env.blog_db
      .prepare('SELECT id FROM admins WHERE username = ?')
      .bind(username)
      .first<{ id: number }>()

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date().toISOString()
    const record = await env.blog_db
      .prepare(
        'SELECT id FROM otp_codes WHERE admin_id = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1',
      )
      .bind(admin.id, otp, now)
      .first<{ id: number }>()

    if (!record) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await env.blog_db
      .prepare('UPDATE otp_codes SET used = 1 WHERE id = ?')
      .bind(record.id)
      .run()

    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    const token = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60000).toISOString()
    const createdAt = new Date().toISOString()

    await env.blog_db
      .prepare('INSERT INTO admin_sessions (admin_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(admin.id, token, expiresAt, createdAt, createdAt)
      .run()

    return new Response(
      JSON.stringify({ success: true, token, admin: { id: admin.id, username } }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
