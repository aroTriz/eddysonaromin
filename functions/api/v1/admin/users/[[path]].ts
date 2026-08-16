/**
 * Account management — single-account + bulk ops (production, D1-backed).
 * Mirrors the Laravel AdminUserController.
 *
 *   PUT    /api/v1/admin/users/{id}          → edit (optional password reset)
 *   DELETE /api/v1/admin/users/{id}          → delete
 *   DELETE /api/v1/admin/users/bulk          → bulk delete (ids array)
 *   POST   /api/v1/admin/users/{id}/ban      → blacklist an account
 *   POST   /api/v1/admin/users/{id}/unban    → remove from the blacklist
 */

import { json, sha256Hex } from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) return false
  const session = await env.blog_db
    .prepare('SELECT s.id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1')
    .bind(token, new Date().toISOString())
    .first()
  return session !== null
}

async function isAdminLinked(env: Env, userId: number): Promise<boolean> {
  const row = await env.blog_db.prepare('SELECT id FROM admins WHERE user_id = ?').bind(userId).first()
  return row !== null
}

function parseIds(body: Record<string, unknown>): number[] {
  const raw = body.ids
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is number => typeof v === 'number' && Number.isInteger(v))
}

function rowToUser(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    is_admin: false,
    banned_at: row.banned_at ?? null,
    conversations: 0,
    created_at: row.created_at ?? '',
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const segments = (params.path as string[] | undefined) ?? []
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ error: 'Account not found.' }, 404)
    const action = segments[1]

    if (action === 'ban' || action === 'unban') {
      if (await isAdminLinked(env, id)) {
        return json(
          { error: 'This account is linked to an admin and cannot be blacklisted.' },
          422,
        )
      }
      const now = new Date().toISOString()
      const res = await env.blog_db
        .prepare('UPDATE users SET banned_at = ?, updated_at = ? WHERE id = ?')
        .bind(action === 'ban' ? now : null, now, id)
        .run()
      if (res.meta.changes === 0) return json({ error: 'Account not found.' }, 404)
      const row = await env.blog_db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
      return json({ data: rowToUser(row ?? {}) })
    }

    return json({ error: 'Not found' }, 404)
  } catch {
    return json({ error: 'Failed to update account.' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const segments = (params.path as string[] | undefined) ?? []
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ error: 'Account not found.' }, 404)

    const user = await env.blog_db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    if (!user) return json({ error: 'Account not found.' }, 404)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = body.name === undefined ? user.name : String(body.name).trim()
    const email = body.email === undefined ? user.email : String(body.email).trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!name || String(name).length > 40) {
      return json({ message: 'The given data was invalid.', errors: { name: ['required'] } }, 422)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ message: 'The given data was invalid.', errors: { email: ['must be a valid email address'] } }, 422)
    }
    if (password && password.length < 8) {
      return json({ message: 'The given data was invalid.', errors: { password: ['must be at least 8 characters'] } }, 422)
    }

    const dup = await env.blog_db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(email, id)
      .first()
    if (dup) return json({ message: 'The given data was invalid.', errors: { email: ['already in use'] } }, 422)

    const now = new Date().toISOString()
    const data: Record<string, unknown> = {
      name,
      email,
      updated_at: now,
      ...(password ? { password: await sha256Hex(password) } : {}),
    }
    const cols = Object.keys(data)
    await env.blog_db
      .prepare(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .bind(...cols.map((c) => data[c]), id)
      .run()

    const row = await env.blog_db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    return json({ data: rowToUser(row ?? {}) })
  } catch {
    return json({ error: 'Failed to update account.' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const segments = (params.path as string[] | undefined) ?? []

    // DELETE /admin/users/bulk { ids: [] }
    if (segments[0] === 'bulk') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      const ids = parseIds(body)
      let deleted = 0
      let protectedCount = 0
      for (const id of ids) {
        if (await isAdminLinked(env, id)) {
          protectedCount++
          continue
        }
        const res = await env.blog_db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
        if (res.meta.changes > 0) deleted++
        else protectedCount++
      }
      return json({ data: { deleted, protected: protectedCount } })
    }

    // DELETE /admin/users/{id}
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ error: 'Account not found.' }, 404)
    if (await isAdminLinked(env, id)) {
      return json({ error: 'This account is linked to an admin and cannot be deleted.' }, 422)
    }
    const res = await env.blog_db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    if (res.meta.changes === 0) return json({ error: 'Account not found.' }, 404)
    return json({ success: true })
  } catch {
    return json({ error: 'Failed to delete account.' }, 500)
  }
}
