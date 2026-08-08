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
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        // Optional override — allows pointing at a custom OpenAI-compatible
        // endpoint if the user sets ASK_API_KEY in the backend .env.
        $base = rtrim((string) env('ASK_API_BASE', 'https://edd-gpt.pages.dev'), '/');
        $key = (string) env('ASK_API_KEY', '');

        $system = $this->systemPrompt();

        // Retry up to 2 times on upstream failures (DeepSeek V4 Flash / EddGPT
        // occasionally return 5xx or timeout under load).
        $maxRetries = 2;
        $lastError = null;

        for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
            try {
                if ($key === '') {
                    // EddGPT proxy path (free, no key needed).
                    $response = Http::timeout(30)->post("{$base}/api/chat", [
                        'message' => $validated['question'],
                        'history' => [
                            ['role' => 'system', 'content' => $system],
                        ],
                    ]);
                } else {
                    // Direct OpenAI-compatible call (when a key is configured).
                    $response = Http::withToken($key)
                        ->timeout(30)
                        ->post("{$base}/chat/completions", [
                            'model' => (string) env('ASK_API_MODEL', 'deepseek-chat'),
                            'messages' => [
                                ['role' => 'system', 'content' => $system],
                                ['role' => 'user', 'content' => $validated['question']],
                            ],
                            'max_tokens' => 500,
                            'temperature' => 0.7,
                        ]);
                }

                if ($response->ok()) {
                    $data = $response->json();
                    $answer = $data['response'] ?? ($data['choices'][0]['message']['content'] ?? null);

                    if ($answer !== null && trim($answer) !== '') {
                        return response()->json(['answer' => trim($answer)]);
                    }
                }

                $lastError = 'The AI provider returned an error: '.$response->status();
            } catch (\Exception $e) {
                $lastError = 'The AI provider returned an error: '.$e->getMessage();
            }

            // Exponential back-off: 1s, 2s between retries.
            if ($attempt < $maxRetries) {
                usleep((int) (pow(2, $attempt) * 1_000_000));
            }
        }

        return response()->json(['error' => $lastError ?? 'No answer returned from the AI provider.'], 502);
    }

    /**
     * System prompt — gives the assistant Eddyson's profile and instructs
     * concise, direct answers (no follow-up questions).
     */
    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are EddysonGPT, the assistant on Eddyson Tristan Aromin's portfolio website.

Who created you: Eddyson Tristan Aromin — a Fullstack AI Engineer based in Quezon City, Philippines, born April 15, 2002. He is a BS Information Technology graduate from Saint Louis University, Baguio City (SAMCIS, 2021–2025). He works as a Junior Front-End Developer at PRAXXYS SOLUTIONS (Vue, Nuxt, Ionic, Flutter, TypeScript, Tailwind, Laravel) and completed a QA Analyst & Business Application Developer internship at NOAH Business Application (Makati). His stack spans PHP, Laravel, MySQL, SQLite, JavaScript, TypeScript, Vue, Nuxt, Ionic, Flutter, Unity, C#, Python, Java, Kotlin, and more. He built 10+ projects including ISakay, Cryptopredictor, ARventure, Triz AI, ItemVision AI, Wordle, and Type Monk E. Contact: aromintristan@gmail.com.

Rules:
- Answer the user's question directly and concisely.
- Answer ONLY what was asked — no follow-up questions, no "anything else?" prompts.
- If asked who created you, say Eddyson Tristan Aromin, a Fullstack AI Engineer born April 15, 2002, from Baguio City / based in Quezon City, and briefly summarize his background.
- If you don't know, say so briefly.
PROMPT;
    }
}
