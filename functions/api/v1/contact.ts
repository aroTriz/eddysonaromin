import { json } from '../../_lib'

interface Env {
  blog_db: D1Database
  /** Optional — when set, the message is also emailed via Resend. */
  RESEND_API_KEY?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TO_EMAIL = 'aromintristan@gmail.com'

/**
 * POST /api/v1/contact — validate, store in D1, and (best-effort) email.
 * Mirrors the Laravel ContactController validation rules.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ message: 'Invalid JSON body.' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const subject =
    typeof body.subject === 'string' && body.subject.trim() !== ''
      ? body.subject.trim()
      : null
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  // Mirrors Laravel: required|string|max:255 (name, email), email format,
  // message required|string|max:5000.
  const errors: Record<string, string[]> = {}
  if (!name) errors.name = ['The name field is required.']
  else if (name.length > 255) errors.name = ['The name must not be greater than 255 characters.']
  if (!email) errors.email = ['The email field is required.']
  else if (!EMAIL_RE.test(email)) errors.email = ['The email must be a valid email address.']
  else if (email.length > 255) errors.email = ['The email must not be greater than 255 characters.']
  if (!message) errors.message = ['The message field is required.']
  else if (message.length > 5000) errors.message = ['The message must not be greater than 5000 characters.']

  if (Object.keys(errors).length > 0) {
    return json({ message: 'The given data was invalid.', errors }, 422)
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const result = await env.blog_db
    .prepare(
      'INSERT INTO contact_messages (name, email, subject, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(name, email, subject, message, now, now)
    .run()

  // Best-effort email via Resend — never fails the request.
  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Portfolio Contact <onboarding@resend.dev>',
        to: [TO_EMAIL],
        subject: `Portfolio message — ${name}${subject ? ` (${subject})` : ''}`,
        text: `From: ${name} <${email}>\nSubject: ${subject ?? '(none)'}\n\n${message}`,
        reply_to: email,
      }),
    }).catch(() => {})
  }

  return json(
    {
      data: {
        id: result.meta.last_row_id,
        name,
        email,
        subject,
        message,
      },
      message: 'Message sent successfully.',
    },
    201,
  )
}
