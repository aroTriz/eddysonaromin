/**
 * Community chat — live stream (production, D1-backed).
 *   GET /api/v1/chat/stream?after={lastId}
 * Server-Sent Events: polls D1 every second and pushes new messages.
 * The client keeps its 8s poll as a fallback if this stream drops.
 */

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
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
          // Lazy purge — scheduled deletions that have passed are removed.
          await env.blog_db
            .prepare('DELETE FROM chat_messages WHERE delete_at IS NOT NULL AND delete_at <= ?')
            .bind(new Date().toISOString())
            .run()

          const { results } = await env.blog_db
            .prepare(
              'SELECT id, name, message, device, created_at FROM chat_messages WHERE archived_at IS NULL AND id > ? ORDER BY id LIMIT 100',
            )
            .bind(lastId)
            .all<Record<string, unknown>>()

          for (const row of results) {
            const data = JSON.stringify({
              id: row.id,
              name: row.name,
              message: row.message,
              device: row.device ?? null,
              created_at: row.created_at,
            })
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
