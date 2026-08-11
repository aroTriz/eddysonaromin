/**
 * POST /api/v1/private/auth/logout — delete the Bearer token → { success }.
 */

import { jsonNoStore, bearerToken } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = bearerToken(request)
  if (token) {
    await env.blog_db.prepare('DELETE FROM private_chat_tokens WHERE token = ?').bind(token).run()
  }
  return jsonNoStore({ success: true })
}
