/**
 * POST /api/v1/admin/private/conversations/{id}/read — mark the visitor's
 * messages as read. Mirrors the Laravel AdminPrivateChatController.
 */

import { jsonNoStore, adminPrivateUserFromRequest, sessionForUser } from '../../../../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, admin.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  await env.blog_db
    .prepare(
      'UPDATE private_chat_messages SET read_at = ? WHERE session_id = ? AND sender_id != ? AND read_at IS NULL',
    )
    .bind(new Date().toISOString(), id, admin.id)
    .run()

  return jsonNoStore({ success: true })
}
