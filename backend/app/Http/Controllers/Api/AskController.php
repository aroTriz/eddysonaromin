<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AskController extends Controller
{
    /**
     * Answer a question by proxying through the EddGPT chat API
     * (https://edd-gpt.pages.dev/api/chat) — the same free OpenAI-backed
     * endpoint the EddGPT chat uses. The API key lives server-side on
     * Cloudflare, so no key is needed here.
     *
     * A system prompt injects Eddyson's profile so the assistant knows
     * who created it and answers concisely (no follow-up questions).
     */
    public function answer(Request $request): JsonResponse
    {
        set_time_limit(0); // CLI calls can be slow
        
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        $question = $validated['question'];

        // Use opencode CLI to get AI answers via muse spark 1.2 contributor
        // opencode run uses its own agent, so we prefix the question directly
        $fullPrompt = "Answer this question directly in 1-3 sentences: {$question}";
        $escapedPrompt = escapeshellarg($fullPrompt);

        $maxRetries = 2;
        $lastError = null;

        for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
            try {
                $output = [];
                $exitCode = 0;
                exec("opencode run {$escapedPrompt} 2>&1", $output, $exitCode);
                $raw = trim(implode("\n", $output));
                // Strip ANSI escape codes and terminal formatting
                $answer = preg_replace('/\x1b\[[0-9;]*[a-zA-Z]/', '', $raw);
                $answer = preg_replace('/^\s*>\s*build\s*·\s*muse-spark-1\.2-contributor\s*/m', '', $answer);
                $answer = trim($answer);

                if ($exitCode === 0 && $answer !== '') {
                    return response()->json(['answer' => $answer]);
                }

                $lastError = 'OpenCode returned empty response.';
            } catch (\Exception $e) {
                $lastError = 'OpenCode error: '.$e->getMessage();
            }

            if ($attempt < $maxRetries) {
                usleep((int) (pow(2, $attempt) * 1_000_000));
            }
        }

        return response()->json(['error' => $lastError ?? 'Failed to get AI response.'], 502);
    }

    /**
     * System prompt — gives the assistant Eddyson's profile and instructs
     * concise, direct answers (no follow-up questions).
     */
    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are Triz.ai, a helpful AI assistant on Eddyson Tristan Aromin's portfolio website. You answer any question the visitor asks — general knowledge, tech, life, anything. Be friendly, concise, and helpful. Never mention that you are a coding tool or CLI. Just answer the question like a normal AI chat assistant. Keep answers under 3 sentences unless more detail is needed.
PROMPT;
    }
}
