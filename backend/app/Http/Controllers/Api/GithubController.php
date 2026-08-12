<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GithubController extends Controller
{
    /**
     * Fetch a user's contribution graph from GitHub (server-side, cached).
     *
     * GitHub exposes the contribution calendar as an HTML fragment at
     * https://github.com/users/{username}/contributions — each cell has a
     * `data-level` attribute (0-4). We parse it into a 7×53 intensity grid
     * matching the halftone contribution graph used on the home page.
     */
    public function contributions(string $username): JsonResponse
    {
        $data = Cache::remember("github:contributions:{$username}", 3600, function () use ($username) {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (portfolio-builder)',
                'Accept' => 'text/html',
            ])->timeout(10)->get("https://github.com/users/{$username}/contributions");

            if (! $response->ok()) {
                return null;
            }

            return $this->parseContributions($response->body());
        });

        if ($data === null) {
            return response()->json(['error' => 'Unable to fetch GitHub contributions.'], 502);
        }

        return response()
            ->json(['data' => $data])
            // The upstream fetch is cached server-side for 1h — mirror that
            // in the response so the browser also reuses the grid.
            ->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    }

    /**
     * Parse the contribution HTML into a 7-row × 53-column grid of levels.
     * Falls back to a hand-shaped halftone pattern when parsing fails.
     */
    private function parseContributions(string $html): array
    {
        preg_match_all('/data-date="([\d-]+)"[^>]*data-level="(\d)"/', $html, $matches, PREG_SET_ORDER);

        if (count($matches) < 350) {
            return $this->fallbackPattern();
        }

        // Build rows by week-of-year column (GitHub renders oldest → newest).
        $weeks = [];
        foreach ($matches as $i => $match) {
            $week = intdiv($i, 7);
            $day = $i % 7;
            $weeks[$week][$day] = (int) $match[2];
        }

        // Normalize to exactly 53 columns (most recent last).
        $grid = array_fill(0, 7, array_fill(0, 53, 0));
        $cols = count($weeks);
        $offset = max(0, 53 - $cols);
        foreach ($weeks as $w => $days) {
            $col = $offset + $w;
            if ($col < 0 || $col >= 53) continue;
            foreach ($days as $d => $level) {
                if ($d >= 0 && $d < 7) $grid[$d][$col] = $level;
            }
        }

        return [
            'username' => null, // set by caller if needed
            'grid' => $grid,
        ];
    }

    /**
     * Hand-shaped halftone fallback (used when GitHub is unreachable).
     */
    private function fallbackPattern(): array
    {
        $row = [2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 3.8, 0, 1.1, 0, 2.7, 0, 2.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 2.7, 0, 1.1];

        return [
            'username' => null,
            'grid' => [
                $row,
                array_fill(0, 53, 0),
                [1.1, 0, 2.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 4.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 2.7, 0, 4.8, 0, 2.7, 0, 2.7],
                array_fill(0, 53, 0),
                [3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 2.7, 0, 1.1, 0, 4.8, 0, 2.7, 0, 4.8],
                array_fill(0, 53, 0),
                [3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 4.8, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 3.8, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7],
            ],
        ];
    }
}
