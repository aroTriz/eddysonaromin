/**
 * GET /api/v1/private/admin — the admin the visitor chats with.
 * → { admin: { id, name } } | 404 when no admin account is linked.
 */

import { jsonNoStore, adminPrivateUser } from '../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const admin = await adminPrivateUser(env)
  if (!admin) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }
  return jsonNoStore({ admin: { id: admin.id, name: admin.name } })
}
