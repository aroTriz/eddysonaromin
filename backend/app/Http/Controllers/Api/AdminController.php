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
        $projects = DB::table('projects')->whereNull('archived_at')->count();
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
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'path' => (string) $r->path,
                'views' => (int) $r->views,
                'visitors' => (int) $r->visitors,
            ])
            ->all();

        // ── Countries (map heat ranking) — all, ordered by visits.
        //    The dashboard shows the top 5; the full list also drives the
        //    cities + map country-filter dropdowns.
        $countries = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->selectRaw("country, max(nullif(country_name, '')) as country_name, count(*) as visits, count(distinct ip) as visitors, min(lat) as lat, min(lon) as lon")
            ->groupBy('country')
            ->orderByDesc('visits')
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

        // ── Cities / towns — all, each tagged with its country code so the
        //    dashboard can filter by "all" or one specific country. Grouped
        //    by (city, country) so same-named cities in different countries
        //    stay separate. The dashboard shows the top 5 of the filtered set.
        $cities = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->selectRaw("city, country, max(nullif(country_name, '')) as country_name, count(*) as visits, count(distinct ip) as visitors, min(lat) as lat, min(lon) as lon")
            ->groupBy('city', 'country')
            ->orderByDesc('visits')
            ->get()
            ->map(fn ($r) => [
                'city' => (string) $r->city,
                'country' => (string) ($r->country ?? ''),
                'country_name' => (string) ($r->country_name ?? ''),
                'visits' => (int) $r->visits,
                'visitors' => (int) $r->visitors,
                'lat' => $r->lat !== null ? (float) $r->lat : null,
                'lon' => $r->lon !== null ? (float) $r->lon : null,
            ])
            ->all();

        // ── Geo points (map heat dots) — each tagged with its country code
        //    so the map can show the whole world or just one country.
        $geo = DB::table('visits')->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->selectRaw('lat, lon, country, count(*) as visits')
            ->groupBy('lat', 'lon', 'country')
            ->orderByDesc('visits')
            ->limit(300)
            ->get()
            ->map(fn ($r) => [
                'lat' => (float) $r->lat,
                'lon' => (float) $r->lon,
                'country' => (string) ($r->country ?? ''),
                'visits' => (int) $r->visits,
            ])
            ->all();

        // ── Operating system breakdown ─────────────────────────
        $os = $this->labels('os', $retentionStart);

        // ── Recent visits — one row per IP (latest activity + visit count) ──
        $recent = DB::table('visits')
            ->where('site', $site)
            ->where('created_at', '>=', $retentionStart)
            ->whereNotNull('ip')
            ->where('ip', '!=', '')
            ->selectRaw("ip,
                count(*) as visits,
                max(created_at) as created_at,
                (select v2.id from visits v2
                   where v2.site = visits.site and v2.ip = visits.ip
                   order by v2.created_at desc limit 1) as visit_id,
                (select v2.path from visits v2
                   where v2.site = visits.site and v2.ip = visits.ip
                   order by v2.created_at desc limit 1) as path,
                (select v3.country from visits v3
                   where v3.site = visits.site and v3.ip = visits.ip
                   order by v3.created_at desc limit 1) as country,
                (select v3b.country_name from visits v3b
                   where v3b.site = visits.site and v3b.ip = visits.ip
                   and v3b.country_name != '' order by v3b.created_at desc limit 1) as country_name,
                (select v3c.region from visits v3c
                   where v3c.site = visits.site and v3c.ip = visits.ip
                   and v3c.region != '' order by v3c.created_at desc limit 1) as region,
                (select v4.city from visits v4
                   where v4.site = visits.site and v4.ip = visits.ip
                   order by v4.created_at desc limit 1) as city,
                (select v5.device from visits v5
                   where v5.site = visits.site and v5.ip = visits.ip
                   order by v5.created_at desc limit 1) as device,
                (select v6.browser from visits v6
                   where v6.site = visits.site and v6.ip = visits.ip
                   order by v6.created_at desc limit 1) as browser,
                (select v7.os from visits v7
                   where v7.site = visits.site and v7.ip = visits.ip
                   order by v7.created_at desc limit 1) as os,
                (select v7b.screen from visits v7b
                   where v7b.site = visits.site and v7b.ip = visits.ip
                   and v7b.screen != '' order by v7b.created_at desc limit 1) as screen,
                (select v7c.cores from visits v7c
                   where v7c.site = visits.site and v7c.ip = visits.ip
                   and v7c.cores != '' order by v7c.created_at desc limit 1) as cores,
                (select v7d.ram from visits v7d
                   where v7d.site = visits.site and v7d.ip = visits.ip
                   and v7d.ram != '' order by v7d.created_at desc limit 1) as ram,
                (select v7e.conn from visits v7e
                   where v7e.site = visits.site and v7e.ip = visits.ip
                   and v7e.conn != '' order by v7e.created_at desc limit 1) as conn,
                (select v7f.lat from visits v7f
                   where v7f.site = visits.site and v7f.ip = visits.ip
                   and v7f.lat is not null order by v7f.created_at desc limit 1) as lat,
                (select v7g.lon from visits v7g
                   where v7g.site = visits.site and v7g.ip = visits.ip
                   and v7g.lon is not null order by v7g.created_at desc limit 1) as lon,
                (select v8.referrer from visits v8
                   where v8.site = visits.site and v8.ip = visits.ip
                   and v8.referrer != '' order by v8.created_at desc limit 1) as referrer")
            ->groupBy('ip')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'id' => (int) ($r->visit_id ?? 0),
                'ip' => $this->maskIp((string) ($r->ip ?? '')),
                'raw_ip' => (string) ($r->ip ?? ''),
                'country' => (string) ($r->country ?? ''),
                'country_name' => (string) ($r->country_name ?? ''),
                'region' => (string) ($r->region ?? ''),
                'city' => (string) ($r->city ?? ''),
                'path' => (string) ($r->path ?? ''),
                'device' => (string) ($r->device ?? ''),
                'browser' => (string) ($r->browser ?? ''),
                'os' => (string) ($r->os ?? ''),
                'screen' => (string) ($r->screen ?? ''),
                'cores' => (string) ($r->cores ?? ''),
                'ram' => (string) ($r->ram ?? ''),
                'conn' => (string) ($r->conn ?? ''),
                'lat' => $r->lat !== null ? (float) $r->lat : null,
                'lon' => $r->lon !== null ? (float) $r->lon : null,
                'referrer' => (string) ($r->referrer ?? ''),
                'visits' => (int) ($r->visits ?? 0),
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
            'os' => $os,
            'recent' => $recent,
        ];
    }

    /**
     * Full visit history for one IP (used by the dashboard "eye" detail modal).
     *
     * GET /api/v1/admin/visits/{ip}
     *   → every recorded visit for that IP, newest first, with masked IPs.
     */
    public function visitHistory(Request $request, string $ip): JsonResponse
    {
        $auth = app(AuthController::class);
        if (! $auth->adminFromRequest($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $retentionStart = now()->subYear()->toDateTimeString();

        $rows = DB::table('visits')
            ->where('site', 'portfolio')
            ->where('ip', $ip)
            ->where('created_at', '>=', $retentionStart)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn ($r) => [
                'id' => (int) $r->id,
                'path' => (string) ($r->path ?? ''),
                'device' => (string) ($r->device ?? ''),
                'browser' => (string) ($r->browser ?? ''),
                'os' => (string) ($r->os ?? ''),
                'screen' => (string) ($r->screen ?? ''),
                'cores' => (string) ($r->cores ?? ''),
                'ram' => (string) ($r->ram ?? ''),
                'lang' => (string) ($r->lang ?? ''),
                'tz' => (string) ($r->tz ?? ''),
                'conn' => (string) ($r->conn ?? ''),
                'isp' => (string) ($r->isp ?? ''),
                'country' => (string) ($r->country ?? ''),
                'country_name' => (string) ($r->country_name ?? ''),
                'region' => (string) ($r->region ?? ''),
                'city' => (string) ($r->city ?? ''),
                'referrer' => (string) ($r->referrer ?? ''),
                'lat' => $r->lat !== null ? (float) $r->lat : null,
                'lon' => $r->lon !== null ? (float) $r->lon : null,
                'created_at' => (string) ($r->created_at ?? ''),
            ])
            ->all();

        return response()->json(['data' => $rows]);
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
