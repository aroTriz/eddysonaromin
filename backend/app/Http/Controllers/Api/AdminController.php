<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard stats for the /aromin admin area (authenticated).
 *
 * GET /api/v1/admin/stats → content counts + full analytics computed from
 * the `visits` table (unique visitors by IP, trends, hourly activity,
 * top pages, country map heat, devices, browsers, OSes, referrers, recent
 * visits).
 */
class AdminController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        // Require a valid admin session — reuse AuthController's guard.
        $auth = app(AuthController::class);
        $admin = $auth->adminFromRequest($request);

        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Data retention: only the last 12 months of visits are kept/stored.
        $this->pruneExpiredVisits();

        $visitor = DB::table('visitors')
            ->where('site', 'portfolio')
            ->first();

        $posts = BlogPost::count();
        $projects = DB::table('projects')->count();
        $messages = DB::table('contact_messages')->count();
        $recommendations = DB::table('recommendations')->count();

        return response()->json([
            'data' => [
                'visitors' => $visitor->count ?? 0,
                'posts' => $posts,
                'projects' => $projects,
                'messages' => $messages,
                'recommendations' => $recommendations,
                'analytics' => $this->analytics(),
            ],
        ]);
    }

    /**
     * Reset all analytics: wipe the `visits` table and zero the visitor
     * counter. Recording restarts from the moment this is called.
     */
    public function clear(Request $request): JsonResponse
    {
        // Require a valid admin session.
        $auth = app(AuthController::class);
        $admin = $auth->adminFromRequest($request);

        if (! $admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        DB::table('visits')->where('site', 'portfolio')->delete();
        DB::table('visitors')->updateOrInsert(
            ['site' => 'portfolio'],
            ['count' => 0, 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['data' => ['cleared' => true, 'cleared_at' => now()->toISOString()]]);
    }

    /** Retention: delete any visit older than 12 months (rolling window). */
    private function pruneExpiredVisits(): void
    {
        DB::table('visits')
            ->where('site', 'portfolio')
            ->where('created_at', '<', now()->subYear())
            ->delete();
    }

    /** All dashboard charts/breakdowns, computed straight from `visits`. */
    private function analytics(): array
    {
        $site = 'portfolio';
        $now = now();
        $today = $now->toDateString();
        // 1-year rolling window — analytics only ever considers the last 12 months.
        $retentionStart = $now->copy()->subYear()->toDateTimeString();

        // ── Totals ─────────────────────────────────────────────
        $visits = fn () => DB::table('visits')
            ->where('site', $site)
            ->where('created_at', '>=', $retentionStart);
        $totals = [
            'visitors' => $this->unique($visits()),
            'views' => (int) $visits()->count(),
            'visitors_today' => $this->unique($visits()->whereDate('created_at', $today)),
            'views_today' => (int) $visits()->whereDate('created_at', $today)->count(),
        ];

        // ── 14-day trend (zero-filled) ─────────────────────────
        $since = $now->copy()->subDays(13)->toDateString().' 00:00:00';
        $rows = DB::table('visits')
            ->where('site', $site)
            ->where('created_at', '>=', $since)
            ->selectRaw('date(created_at) as day, count(*) as views, count(distinct ip) as visitors')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->toDateString();
            $row = $rows->get($day);
            $series[] = [
                'date' => $day,
                'visitors' => (int) ($row->visitors ?? 0),
                'views' => (int) ($row->views ?? 0),
            ];
        }

        // ── Hourly activity (last 12 months, local server time) ──
        $hourly = array_fill(0, 24, 0);
        foreach (DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->selectRaw("cast(strftime('%H', created_at) as integer) as h, count(*) as c")
            ->groupBy('h')
            ->get() as $row) {
            $h = (int) $row->h;
            if (isset($hourly[$h])) {
                $hourly[$h] = (int) $row->c;
            }
        }

        // ── Top pages ──────────────────────────────────────────
        $topPages = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->selectRaw("coalesce(nullif(path, ''), '/') as path, count(*) as views, count(distinct ip) as visitors")
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'path' => (string) $r->path,
                'views' => (int) $r->views,
                'visitors' => (int) $r->visitors,
            ])
            ->all();

        // ── Countries (map heat ranking) — top 5 ──────────────
        $countries = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->selectRaw("country, max(nullif(country_name, '')) as country_name, count(*) as visits, count(distinct ip) as visitors, min(lat) as lat, min(lon) as lon")
            ->groupBy('country')
            ->orderByDesc('visits')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'country' => (string) $r->country,
                'country_name' => (string) ($r->country_name ?? ''),
                'visits' => (int) $r->visits,
                'visitors' => (int) $r->visitors,
                'lat' => $r->lat !== null ? (float) $r->lat : null,
                'lon' => $r->lon !== null ? (float) $r->lon : null,
            ])
            ->all();

        // ── Top cities / towns — top 5 ─────────────────────────
        $cities = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->selectRaw("city, max(nullif(country_name, '')) as country_name, count(*) as visits, count(distinct ip) as visitors")
            ->groupBy('city')
            ->orderByDesc('visits')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'city' => (string) $r->city,
                'country_name' => (string) ($r->country_name ?? ''),
                'visits' => (int) $r->visits,
                'visitors' => (int) $r->visitors,
            ])
            ->all();

        // ── Geo points (map heat dots) ─────────────────────────
        $geo = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->selectRaw('lat, lon, count(*) as visits')
            ->groupBy('lat', 'lon')
            ->orderByDesc('visits')
            ->limit(300)
            ->get()
            ->map(fn ($r) => [
                'lat' => (float) $r->lat,
                'lon' => (float) $r->lon,
                'visits' => (int) $r->visits,
            ])
            ->all();

        // ── Device / browser / OS breakdown ────────────────────
        $devices = $this->labels('device', $retentionStart);
        $browsers = $this->labels('browser', $retentionStart);
        $os = $this->labels('os', $retentionStart);

        // ── Referrers (grouped by domain) ──────────────────────
        $referrerRows = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('referrer')
            ->where('referrer', '!=', '')
            ->selectRaw('referrer, count(*) as count')
            ->groupBy('referrer')
            ->orderByDesc('count')
            ->limit(20)
            ->get();

        $referrerTotals = [];
        foreach ($referrerRows as $row) {
            $domain = $this->referrerDomain((string) $row->referrer);
            $referrerTotals[$domain] = ($referrerTotals[$domain] ?? 0) + (int) $row->count;
        }
        arsort($referrerTotals);
        $referrers = collect($referrerTotals)
            ->take(10)
            ->map(fn (int $count, string $domain) => ['domain' => $domain, 'count' => $count])
            ->values()
            ->all();

        // ── Recent visits (IPs masked) — latest 5 only ─────────
        $recent = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'ip' => $this->maskIp((string) ($r->ip ?? '')),
                'country' => (string) ($r->country ?? ''),
                'city' => (string) ($r->city ?? ''),
                'path' => (string) ($r->path ?? ''),
                'device' => (string) ($r->device ?? ''),
                'browser' => (string) ($r->browser ?? ''),
                'os' => (string) ($r->os ?? ''),
                'created_at' => (string) ($r->created_at ?? ''),
            ])
            ->all();

        return [
            'totals' => $totals,
            'series' => $series,
            'hourly' => $hourly,
            'top_pages' => $topPages,
            'countries' => $countries,
            'cities' => $cities,
            'geo' => $geo,
            'devices' => $devices,
            'browsers' => $browsers,
            'os' => $os,
            'referrers' => $referrers,
            'recent' => $recent,
        ];
    }

    /** COUNT(DISTINCT ip) with empty/null guard. */
    private function unique($query): int
    {
        return (int) (clone $query)
            ->whereNotNull('ip')
            ->where('ip', '!=', '')
            ->distinct()
            ->count('ip');
    }

    /** [label, count] pairs for a single nullable text column (last 12 months). */
    private function labels(string $column, string $since): array
    {
        return collect(
            DB::table('visits')
                ->where('site', 'portfolio')
                ->where('created_at', '>=', $since)
                ->selectRaw("coalesce(nullif({$column}, ''), 'Unknown') as label, count(*) as count")
                ->groupBy('label')
                ->orderByDesc('count')
                ->get()
        )->map(fn ($r) => [
            'label' => (string) $r->label,
            'count' => (int) $r->count,
        ])->values()->all();
    }

    /** Hostname of a referrer URL (or the raw string when unparsable). */
    private function referrerDomain(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (is_string($host) && $host !== '') {
            return preg_replace('/^www\./', '', $host) ?? $host;
        }

        return $url !== '' ? $url : 'direct';
    }

    /** 192.168.1.5 → 192.168.1.x · 2001:db8::1 → 2001:db8::x */
    private function maskIp(string $ip): string
    {
        if ($ip === '') {
            return '';
        }
        if (str_contains($ip, ':')) {
            $parts = explode(':', $ip);

            return count($parts) > 1 ? implode(':', array_slice($parts, 0, 3)).':…' : $ip;
        }
        $parts = explode('.', $ip);

        return count($parts) === 4 ? implode('.', array_slice($parts, 0, 3)).'.x' : $ip;
    }
}
