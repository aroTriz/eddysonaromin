/**
 * POST /api/v1/private/conversations/{id}/read — mark incoming messages as read.
 * Mirrors the Laravel PrivateChatController.
 */

import { jsonNoStore, privateUserFromRequest, sessionForUser } from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  await env.blog_db
    .prepare(
      'UPDATE private_chat_messages SET read_at = ? WHERE session_id = ? AND sender_id != ? AND read_at IS NULL',
    )
    .bind(new Date().toISOString(), id, user.id)
    .run()

  return jsonNoStore({ success: true })
}
