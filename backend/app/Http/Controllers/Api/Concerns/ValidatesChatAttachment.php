<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\Request;

/**
 * Shared attachment handling for private chat (visitor + admin sides).
 *
 * An attachment is a JSON string on the message row:
 *   { "kind": "image"|"file", "name", "size", "mime", "data" }
 * where `data` is a base64 data-URL (the site stores blog images the same
 * way, and it keeps the Cloudflare D1 mirror free of file storage).
 */
trait ValidatesChatAttachment
{
    /** Max decoded bytes for one attachment. */
    private const ATTACHMENT_MAX_BYTES = 2_500_000;

    /** Image kinds render inline; everything else is a file card. */
    private const IMAGE_MIMES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp',
    ];

    /**
     * Validate + normalize the `attachment` request field.
     * Returns the JSON string to store, or null when no attachment was sent.
     * Throws a 422 ValidationException on malformed/oversized input.
     */
    protected function attachmentJson(Request $request): ?string
    {
        if (! $request->has('attachment')) {
            return null;
        }

        $validated = $request->validate([
            'attachment' => ['required', 'array'],
            'attachment.kind' => ['required', 'string', 'in:image,file'],
            'attachment.name' => ['required', 'string', 'max:255'],
            'attachment.size' => ['required', 'integer', 'min:1'],
            'attachment.mime' => ['required', 'string', 'max:100'],
            'attachment.data' => ['required', 'string'],
        ]);

        $kind = $validated['attachment']['kind'];
        $size = (int) $validated['attachment']['size'];
        $mime = strtolower((string) $validated['attachment']['mime']);
        $data = (string) $validated['attachment']['data'];

        if ($size > self::ATTACHMENT_MAX_BYTES) {
            return $this->attachmentError('attachments are limited to 2.5MB');
        }

        if ($kind === 'image' && ! in_array($mime, self::IMAGE_MIMES, true)) {
            return $this->attachmentError('unsupported image type');
        }

        // Must be a base64 data-URL whose payload roughly matches the size.
        if (! preg_match('#^data:[a-zA-Z0-9+./-]+;base64,#', $data)) {
            return $this->attachmentError('invalid attachment data');
        }
        $base64 = substr($data, strpos($data, ',') + 1);
        if ($base64 === '' || (int) (strlen($base64) * 0.75) > $size + 64) {
            return $this->attachmentError('attachment data is corrupted');
        }

        return json_encode([
            'kind' => $kind,
            'name' => mb_substr($validated['attachment']['name'], 0, 255),
            'size' => $size,
            'mime' => $mime,
            'data' => $data,
        ], JSON_UNESCAPED_SLASHES);
    }

    /** Parse a stored attachment JSON column back into an array/null. */
    protected function parseAttachment(?string $json): ?array
    {
        if (! $json) {
            return null;
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function attachmentError(string $message): never
    {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'attachment' => [$message],
        ]);
    }
}
