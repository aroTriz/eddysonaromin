/**
 * POST /api/v1/auth/login — validate username/password (SHA-256), generate a
 * 6-digit OTP, and email it via Resend's free tier. When no RESEND_API_KEY is
 * configured, returns the OTP in dev_mode (same behaviour as the previous
 * projects' Pages Functions).
 */

interface Env {
  blog_db: D1Database
  RESEND_API_KEY?: string
}

const OTP_TTL_MINUTES = 5

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function otpEmailHtml(otp: string): string {
  const spaced = otp.split('').join(' ')
  return `<div style="background:#0c0c0f;padding:32px;font-family:'JetBrains Mono','Courier New',monospace;max-width:480px;margin:0 auto;border:1px solid #26262b;border-radius:12px;text-align:center">
<div style="background:#141417;padding:10px 20px;border-bottom:1px solid #26262b;border-radius:12px 12px 0 0;margin:-32px -32px 24px -32px;display:flex;align-items:center;justify-content:space-between">
<span style="color:#a1a1aa;font-size:11px;letter-spacing:0.5px">&lt; Aromin / Admin &gt;</span>
<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#27c93f;margin-left:4px"></span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffbd2e;margin-left:4px"></span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5f56;margin-left:4px"></span></span>
</div>
<p style="color:#a1a1aa;font-size:11px;margin:0 0 4px 0">// ADMIN OTP VERIFICATION</p>
<p style="color:#71717a;font-size:12px;margin:0 0 24px 0">Enter the code below to complete your sign-in</p>
<div style="background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid #3f3f46;border-radius:8px;padding:20px;margin-bottom:20px">
<p style="font-size:40px;font-weight:700;letter-spacing:12px;color:#fafafa;margin:0;font-family:'Courier New',monospace">${spaced}</p>
<p style="color:#71717a;font-size:10px;margin:12px 0 0 0">// valid for 5 minutes</p>
</div>
<p style="color:#52525b;font-size:10px;margin:0;line-height:1.6">If you didn't request this code, you can safely ignore this email.</p>
<div style="border-top:1px solid #1f1f23;padding-top:14px;margin-top:20px;text-align:center">
<p style="color:#3f3f46;font-size:10px;margin:0">Aromin Portfolio &bull; <span style="color:#71717a">admin area</span></p>
</div>
</div>`
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { username?: string; password?: string }
    const { username, password } = body
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const admin = await env.blog_db
      .prepare('SELECT id, password_hash, email FROM admins WHERE username = ?')
      .bind(username)
      .first<{ id: number; password_hash: string; email: string }>()

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const hash = await sha256Hex(password)
    if (hash !== admin.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString()

    await env.blog_db
      .prepare('UPDATE otp_codes SET used = 1 WHERE admin_id = ? AND used = 0')
      .bind(admin.id)
      .run()
    await env.blog_db
      .prepare('INSERT INTO otp_codes (admin_id, code, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(admin.id, otp, expiresAt, new Date().toISOString(), new Date().toISOString())
      .run()

    // TEMP DEV MODE: email disabled to save SMTP credits.
    const emailSent = false
    // let emailSent = false
    // if (env.RESEND_API_KEY && admin.email) {
    //   const res = await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${env.RESEND_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       from: 'Aromin Admin <onboarding@resend.dev>',
    //       to: [admin.email],
    //       subject: 'Admin OTP — Aromin Portfolio',
    //       html: otpEmailHtml(otp),
    //     }),
    //   })
    //   if (res.ok) emailSent = true
    // }

    const result: Record<string, unknown> = {
      success: true,
      email_sent: emailSent,
      email: admin.email,
    }
    if (!emailSent) {
      result.otp = otp
      result.dev_mode = true
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
