/**
 * Private chat — live stream (production, D1-backed).
 *   GET /api/v1/private/conversations/{id}/stream?after={lastId}
 * Server-Sent Events with Bearer auth; polls D1 every second and pushes
 * new messages (with attachments) plus `typing` events whenever the set
 * of people typing changes. The client keeps its 8s poll as a fallback.
 * Mirrors the Laravel PrivateChatController stream.
 */

import { privateUserFromRequest, sessionForUser, rowToPrivateMessage } from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

const MAX_AFTER = 100

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, user.id))) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = after
      let lastTypingKey = ''
      let live = true

      const send = (chunk: string): void => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          live = false
        }
      }

      try {
        while (live) {
          const { results } = await env.blog_db
            .prepare(
              'SELECT id, sender_id, message, attachment, created_at FROM private_chat_messages WHERE session_id = ? AND id > ? ORDER BY id LIMIT ?',
            )
            .bind(id, lastId, MAX_AFTER)
            .all<Record<string, unknown>>()

          for (const row of results) {
            const data = JSON.stringify(rowToPrivateMessage(row))
            send(`event: message\ndata: ${data}\n\n`)
            lastId = Number(row.id)
          }

          // Typing state — emit only when the set of typers changes.
          const typing = await activeTyping(env, id)
          const typingKey = JSON.stringify(typing)
          if (typingKey !== lastTypingKey) {
            lastTypingKey = typingKey
            send(`event: typing\ndata: ${JSON.stringify({ users: typing })}\n\n`)
          }

          send(': keepalive\n\n')
          await new Promise((r) => setTimeout(r, 1000))
        }
      } catch {
        /* stream ended */
      } finally {
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Currently typing participants (non-expired typing rows + names). */
async function activeTyping(env: Env, conversationId: number): Promise<{ id: number; name: string }[]> {
  const now = new Date().toISOString()
  const { results } = await env.blog_db
    .prepare(
      `SELECT t.user_id AS id, u.name FROM private_chat_typing t
       JOIN users u ON u.id = t.user_id
       WHERE t.conversation_id = ? AND t.typing_until > ?
       ORDER BY t.user_id`,
    )
    .bind(conversationId, now)
    .all<{ id: number; name: string }>()
  return results.map((r) => ({ id: Number(r.id), name: String(r.name) }))
}
