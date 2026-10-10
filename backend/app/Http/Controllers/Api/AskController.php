<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AskController extends Controller
{
    /**
     * Answer a question through the OpenAI API (key in backend/.env as
     * ASK_API_KEY — never in code). Model via ASK_API_MODEL, base via
     * ASK_API_BASE. Billed per use on the OpenAI account; a ChatGPT
     * subscription alone does NOT fund API calls.
     *
     * Fallback: when OpenAI is unreachable, rejects the key, or reports
     * exhausted credits, answers come from the free Pollinations text API
     * so Ask Triz keeps working with zero configuration.
     */
    public function answer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        // Repeat questions answer instantly (5-minute memory, per server worker).
        $cached = $this->cachedAnswer($validated['question']);
        if ($cached !== null) {
            return response()->json(['answer' => $cached]);
        }

        $key = (string) env('ASK_API_KEY', '');

        if ($key !== '') {
            $answer = $this->openAiChat($validated['question']);
            if ($answer !== null) {
                $this->storeAnswer($validated['question'], $answer);

                return response()->json(['answer' => $answer]);
            }
        }

        $fallback = $this->pollinationsText($validated['question']);
        if ($fallback !== null) {
            $this->storeAnswer($validated['question'], $fallback);

            return response()->json(['answer' => $fallback]);
        }

        return response()->json(['error' => 'The AI is unreachable right now — try again in a bit.'], 502);
    }

    /** Cache key for a repeat question (5-minute file cache). */
    private function cacheKey(string $question): string
    {
        return 'ask:'.md5($question);
    }

    private function cachedAnswer(string $question): ?string
    {
        // File store is shared by every server worker (unlike static memory).
        $hit = Cache::store('file')->get($this->cacheKey($question));

        return is_string($hit) && $hit !== '' ? $hit : null;
    }

    private function storeAnswer(string $question, string $answer): void
    {
        Cache::store('file')->put($this->cacheKey($question), $answer, 300);
    }

    /** OpenAI chat completion. Returns the answer or null on any failure. */
    private function openAiChat(string $question): ?string
    {
        $key = (string) env('ASK_API_KEY', '');
        $base = rtrim((string) env('ASK_API_BASE', 'https://api.openai.com'), '/');
        $model = (string) env('ASK_API_MODEL', 'gpt-4o-mini');

        try {
            $response = Http::withToken($key)
                ->timeout(60)
                ->retry(1, 500, throw: false)
                ->post($base.'/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => $this->systemPrompt()],
                        ['role' => 'user', 'content' => $question],
                    ],
                    'max_tokens' => 1024,
                    'temperature' => 0.7,
                ]);
        } catch (\Exception $e) {
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        $answer = $response->json('choices.0.message.content');
        if (!is_string($answer) || trim($answer) === '') {
            return null;
        }

        return trim($answer);
    }

    /** Free Pollinations text API (OpenAI-compatible shape). Null on failure. */
    private function pollinationsText(string $question): ?string
    {
        try {
            $response = Http::timeout(90)
                ->retry(1, 1000, throw: false)
                ->post('https://text.pollinations.ai/openai', [
                    'model' => 'openai',
                    'messages' => [
                        ['role' => 'system', 'content' => $this->systemPrompt()],
                        ['role' => 'user', 'content' => $question],
                    ],
                ]);
        } catch (\Exception $e) {
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        $answer = $response->json('choices.0.message.content');
        if (!is_string($answer) || trim($answer) === '') {
            return null;
        }

        return trim($answer);
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
