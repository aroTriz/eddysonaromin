<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Admin authentication for the /aromin area.
 *
 * Flow (mirrors the previous projects' Pages Functions):
 *   1. POST /auth/login  → { username, password } → validates SHA-256 hash,
 *      generates a 6-digit OTP, emails it via Resend (free tier). If no
 *      RESEND_API_KEY is configured, returns the OTP in dev_mode.
 *   2. POST /auth/verify  → { username, otp } → returns a session token.
 *   3. GET  /auth/session → validates a Bearer token.
 *   4. POST /auth/logout  → deletes the session token.
 */
class AuthController extends Controller
{
    /** Session validity window. */
    private const SESSION_TTL_MINUTES = 60 * 24 * 7; // 7 days

    /** OTP validity window. */
    private const OTP_TTL_MINUTES = 5;

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $admin = DB::table('admins')
            ->where('username', $validated['username'])
            ->first();

        if (! $admin) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $hash = hash('sha256', $validated['password']);
        if (! hash_equals((string) $admin->password_hash, $hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // ── TEMP DEV MODE ──────────────────────────────────────────────
        // OTP is pinned to 111111 and the Resend email is disabled so no
        // free-SMTP credits are consumed while testing locally.
        // To restore real behaviour, uncomment the two lines below and
        // delete the pinned ones.
        $otp = '111111';
        // $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('otp_codes')
            ->where('admin_id', $admin->id)
            ->where('used', false)
            ->update(['used' => true]);
        DB::table('otp_codes')->insert([
            'admin_id' => $admin->id,
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // TEMP DEV MODE: email disabled to save SMTP credits.
        $emailSent = false;
        // $emailSent = $this->sendOtpEmail((string) $admin->email, $otp);

        $res = [
            'success' => true,
            'email_sent' => $emailSent,
            'email' => $admin->email,
        ];

        // Dev fallback — no Resend key configured: surface the OTP so the
        // flow remains testable locally (same behaviour as previous projects).
        if (! $emailSent) {
            $res['otp'] = $otp;
            $res['dev_mode'] = true;
        }

        return response()->json($res);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $admin = DB::table('admins')
            ->where('username', $validated['username'])
            ->first();

        if (! $admin) {
            return response()->json(['error' => 'Invalid'], 401);
        }

        $record = DB::table('otp_codes')
            ->where('admin_id', $admin->id)
            ->where('code', $validated['otp'])
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if (! $record) {
            return response()->json(['error' => 'Invalid or expired OTP'], 401);
        }

        DB::table('otp_codes')->where('id', $record->id)->update(['used' => true]);

        $token = bin2hex(random_bytes(32));
        DB::table('admin_sessions')->insert([
            'admin_id' => $admin->id,
            'token' => $token,
            'expires_at' => now()->addMinutes(self::SESSION_TTL_MINUTES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'admin' => ['id' => $admin->id, 'username' => $admin->username],
        ]);
    }

    public function session(Request $request): JsonResponse
    {
        $admin = $this->adminFromRequest($request);

        if (! $admin) {
            return response()->json(['authenticated' => false], 401);
        }

        return response()->json([
            'authenticated' => true,
            'admin' => ['id' => $admin->id, 'username' => $admin->username],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $this->bearerToken($request);
        if ($token) {
            DB::table('admin_sessions')->where('token', $token)->delete();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Resolve the admin behind a Bearer token, or null when invalid/expired.
     */
    public function adminFromRequest(Request $request): ?object
    {
        $token = $this->bearerToken($request);
        if (! $token) {
            return null;
        }

        $session = DB::table('admin_sessions')
            ->join('admins', 'admins.id', '=', 'admin_sessions.admin_id')
            ->where('admin_sessions.token', $token)
            ->where('admin_sessions.expires_at', '>', now())
            ->select('admins.id', 'admins.username')
            ->first();

        return $session;
    }

    private function bearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return $m[1];
        }

        return null;
    }    /**
     * Send the OTP via Resend's free tier (onboarding@resend.dev).
     * Returns true when the request succeeded.
     */
    private function sendOtpEmail(string $to, string $otp): bool
    {
        $key = (string) env('RESEND_API_KEY', '');
        if ($key === '' || $to === '') {
            return false;
        }

        try {
            $response = Http::timeout(10)
                ->withToken($key)
                ->post('https://api.resend.com/emails', [
                    'from' => 'Aromin Admin <onboarding@resend.dev>',
                    'to' => [$to],
                    'subject' => 'Admin OTP — Aromin Portfolio',
                    'html' => $this->otpEmailHtml($otp),
                ]);

            return $response->ok();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Dark, mono-themed OTP email — matches the site's design language.
     */
    private function otpEmailHtml(string $otp): string
    {
        $spaced = implode(' ', str_split($otp));

        return <<<HTML
<div style="background:#0c0c0f;padding:32px;font-family:'JetBrains Mono','Courier New',monospace;max-width:480px;margin:0 auto;border:1px solid #26262b;border-radius:12px;text-align:center">
<div style="background:#141417;padding:10px 20px;border-bottom:1px solid #26262b;border-radius:12px 12px 0 0;margin:-32px -32px 24px -32px;display:flex;align-items:center;justify-content:space-between">
<span style="color:#a1a1aa;font-size:11px;letter-spacing:0.5px">&lt; Aromin / Admin &gt;</span>
<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#27c93f;margin-left:4px"></span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffbd2e;margin-left:4px"></span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5f56;margin-left:4px"></span></span>
</div>
<p style="color:#a1a1aa;font-size:11px;margin:0 0 4px 0">// ADMIN OTP VERIFICATION</p>
<p style="color:#71717a;font-size:12px;margin:0 0 24px 0">Enter the code below to complete your sign-in</p>
<div style="background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid #3f3f46;border-radius:8px;padding:20px;margin-bottom:20px">
<p style="font-size:40px;font-weight:700;letter-spacing:12px;color:#fafafa;margin:0;font-family:'Courier New',monospace">{$spaced}</p>
<p style="color:#71717a;font-size:10px;margin:12px 0 0 0">// valid for 5 minutes</p>
</div>
<p style="color:#52525b;font-size:10px;margin:0;line-height:1.6">If you didn't request this code, you can safely ignore this email.</p>
<div style="border-top:1px solid #1f1f23;padding-top:14px;margin-top:20px;text-align:center">
<p style="color:#3f3f46;font-size:10px;margin:0">Aromin Portfolio &bull; <span style="color:#71717a">admin area</span></p>
</div>
</div>
HTML;
    }
}
