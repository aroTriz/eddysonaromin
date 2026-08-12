<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Visitor counter + page-view analytics.
 *   GET  /api/v1/visitors → unique visitor count
 *   POST /api/v1/visitors → record a page view + return the unique count
 *
 * Unique visitors are counted by IP: the same IP visiting (or refreshing)
 * any number of times is ONE visitor. Every page view is stored in the
 * `visits` table so the /aromin dashboard can chart trends, top pages,
 * countries, devices, browsers and OSes. `visitors.count` is a
 * denormalized cache of COUNT(DISTINCT ip) over `visits`.
 */
class VisitorController extends Controller
{
    public function index(): JsonResponse
    {
        $visitor = DB::table('visitors')->where('site', 'portfolio')->first();

        return response()->json(['count' => $visitor->count ?? 0]);
    }

    public function increment(Request $request): JsonResponse
    {
        $now = now();

        // Data retention: only the last 12 months of visits are kept. Old
        // rows are lazily purged on every recorded view (cheap index scan).
        DB::table('visits')
            ->where('site', 'portfolio')
            ->where('created_at', '<', $now->copy()->subYear())
            ->delete();

        // Real public IP (sent by the client from ipwho.is); fall back to the
        // request IP when absent/invalid.
        $ip = trim((string) $request->input('ip', ''));
        if ($ip === '' || filter_var($ip, FILTER_VALIDATE_IP) === false) {
            $ip = (string) $request->ip();
        }

        $lat = $request->input('lat');
        $lon = $request->input('lon');

        DB::table('visits')->insert([
            'site' => 'portfolio',
            'ip' => $ip !== '' ? substr($ip, 0, 45) : null,
            'country' => $this->clean($request->input('country'), 2) ?: null,
            'country_name' => $this->clean($request->input('country_name'), 80) ?: null,
            'region' => $this->clean($request->input('region'), 80) ?: null,
            'city' => $this->clean($request->input('city'), 80) ?: null,
            'lat' => is_numeric($lat) ? (float) $lat : null,
            'lon' => is_numeric($lon) ? (float) $lon : null,
            'path' => $this->clean($request->input('path'), 255) ?: null,
            'referrer' => $this->clean($request->input('referrer'), 500) ?: null,
            'device' => $this->clean($request->input('device'), 40) ?: null,
            'browser' => $this->clean($request->input('browser'), 40) ?: null,
            'os' => $this->clean($request->input('os'), 40) ?: null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $unique = $this->uniqueVisitorCount();

        DB::table('visitors')->updateOrInsert(
            ['site' => 'portfolio'],
            ['count' => $unique, 'created_at' => $now, 'updated_at' => $now]
        );

        return response()->json(['count' => $unique]);
    }

    /** Lifetime unique visitors — distinct IPs over all recorded visits. */
    private function uniqueVisitorCount(): int
    {
        return (int) DB::table('visits')
            ->where('site', 'portfolio')
            ->whereNotNull('ip')
            ->where('ip', '!=', '')
            ->distinct()
            ->count('ip');
    }

    /** Trim + truncate a request value ('' when missing). */
    private function clean(mixed $value, int $max): string
    {
        $value = trim((string) $value);

        return mb_strlen($value) > $max ? mb_substr($value, 0, $max) : $value;
    }
}
