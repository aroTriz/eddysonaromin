/**
 * Private chat — admin live stream (production, D1-backed).
 *   GET /api/v1/admin/private/conversations/{id}/stream?after={lastId}
 * Server-Sent Events with admin Bearer auth; polls D1 every second.
 * The client keeps its 8s poll as a fallback.
 * Mirrors the Laravel AdminPrivateChatController stream.
 */

import { adminPrivateUserFromRequest, sessionForUser, rowToPrivateMessage } from '../../../../../../_lib'

interface Env {
  blog_db: D1Database
}

const MAX_AFTER = 100

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, admin.id))) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = after
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
              'SELECT id, sender_id, message, created_at FROM private_chat_messages WHERE session_id = ? AND id > ? ORDER BY id LIMIT ?',
            )
            .bind(id, lastId, MAX_AFTER)
            .all<Record<string, unknown>>()

          for (const row of results) {
            const data = JSON.stringify(rowToPrivateMessage(row))
            send(`event: message\ndata: ${data}\n\n`)
            lastId = Number(row.id)
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
