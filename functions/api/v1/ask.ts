import { json } from '../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * POST /api/v1/ask — proxy a question to the EddGPT chat API
 * (https://edd-gpt.pages.dev/api/chat) with Eddyson's system prompt.
 * Mirrors the Laravel AskController (no API key needed — EddGPT
 * holds the key server-side).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) {
    return json({ error: 'The question field is required.' }, 422)
  }
  if (question.length > 500) {
    return json({ error: 'The question must not be greater than 500 characters.' }, 422)
  }

  try {
    // Retry up to 2 times on upstream failures (DeepSeek V4 Flash / EddGPT
    // occasionally return 5xx or timeout under load).
    const maxRetries = 2
    let lastError = ''

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 25_000)

        const response = await fetch('https://edd-gpt.pages.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: question,
            history: [{ role: 'system', content: SYSTEM_PROMPT }],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          lastError = `The AI provider returned an error: ${response.status}`
          // Retry on 5xx (server-side) but not on 4xx (client-side).
          if (response.status < 500) {
            return json({ error: lastError }, 502)
          }
        } else {
          const data = (await response.json()) as {
            response?: string
            choices?: Array<{ message?: { content?: string } }>
          }
          const answer = data.response ?? data.choices?.[0]?.message?.content ?? null
          if (answer && answer.trim() !== '') {
            return json({ answer: answer.trim() })
          }
          lastError = 'No answer returned from the AI provider.'
        }
      } catch (err: unknown) {
        lastError = err instanceof Error && err.name === 'AbortError'
          ? 'The AI provider timed out.'
          : 'The AI provider returned an error.'
      }

      // Exponential back-off: 1s, 2s between retries.
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
    }

    return json({ error: lastError || 'The AI provider returned an error.' }, 502)
  } catch {
    return json({ error: 'The AI provider returned an error.' }, 502)
  }
}

const SYSTEM_PROMPT = `You are EddysonGPT, the assistant on Eddyson Tristan Aromin's portfolio website.

Who created you: Eddyson Tristan Aromin — a Fullstack AI Engineer based in Quezon City, Philippines, born April 15, 2002. He is a BS Information Technology graduate from Saint Louis University, Baguio City (SAMCIS, 2021–2025). He works as a Junior Front-End Developer at PRAXXYS SOLUTIONS (Vue, Nuxt, Ionic, Flutter, TypeScript, Tailwind, Laravel) and completed a QA Analyst & Business Application Developer internship at NOAH Business Application (Makati). His stack spans PHP, Laravel, MySQL, SQLite, JavaScript, TypeScript, Vue, Nuxt, Ionic, Flutter, Unity, C#, Python, Java, Kotlin, and more. He built 10+ projects including ISakay, Cryptopredictor, ARventure, Triz AI, ItemVision AI, Wordle, and Type Monk E. Contact: aromintristan@gmail.com.

Rules:
- Answer the user's question directly and concisely.
- Answer ONLY what was asked — no follow-up questions, no "anything else?" prompts.
- If asked who created you, say Eddyson Tristan Aromin, a Fullstack AI Engineer born April 15, 2002, from Baguio City / based in Quezon City, and briefly summarize his background.
- If you don't know, say so briefly.`
