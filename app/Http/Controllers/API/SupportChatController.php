<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupportChatController extends Controller
{
    public function reply(Request $request)
    {
        $validated = $request->validate([
            'messages' => 'required|array|min:1|max:12',
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string|min:1|max:2000',
        ]);

        $messages = array_map(static fn (array $message) => [
            'role' => $message['role'],
            'content' => trim($message['content']),
        ], $validated['messages']);

        if (($messages[count($messages) - 1]['role'] ?? null) !== 'user') {
            return response()->json(['message' => 'Send a question to continue.'], 422);
        }

        $url = trim((string) config('services.carvex_chatbot.url'));
        $key = trim((string) config('services.carvex_chatbot.key'));
        $model = trim((string) config('services.carvex_chatbot.model'));

        if ($url === '' || $key === '' || $model === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            return response()->json([
                'message' => 'CarVex chat is not configured yet. Contact support@carvex.ph for help.',
                'code' => 'chat_unavailable',
            ], 503);
        }

        $systemMessage = <<<'PROMPT'
You are the CarVex customer-support assistant for a Philippine automotive-parts marketplace.
Answer briefly and helpfully. You may explain general parts terminology and how to use the CarVex site.
Never claim to know live inventory, order status, prices, shipping times, or a vehicle's exact fitment unless the user provides verified details in the conversation. Do not invent product listings, policies, or payment outcomes. For uncertain compatibility or account/order-specific questions, direct the customer to the product seller or support@carvex.ph. Do not request passwords, payment card details, or authentication codes.
PROMPT;

        try {
            $response = Http::acceptJson()
                ->withToken($key)
                ->timeout(20)
                ->post($url, [
                    'model' => $model,
                    'messages' => array_merge([
                        ['role' => 'system', 'content' => $systemMessage],
                    ], $messages),
                    'max_tokens' => 500,
                    'temperature' => 0.2,
                ]);

            if (!$response->successful()) {
                Log::warning('CarVex support chat provider returned an error.', [
                    'status' => $response->status(),
                ]);

                return response()->json([
                    'message' => 'CarVex chat is temporarily unavailable. Contact support@carvex.ph for help.',
                    'code' => 'chat_provider_error',
                ], 502);
            }

            $reply = trim((string) $response->json('choices.0.message.content', ''));
            if ($reply === '') {
                return response()->json([
                    'message' => 'CarVex chat did not return a reply. Contact support@carvex.ph for help.',
                    'code' => 'chat_empty_reply',
                ], 502);
            }

            return response()->json(['reply' => $reply]);
        } catch (\Throwable $exception) {
            Log::warning('CarVex support chat request failed.', [
                'exception' => get_class($exception),
            ]);

            return response()->json([
                'message' => 'CarVex chat is temporarily unavailable. Contact support@carvex.ph for help.',
                'code' => 'chat_provider_error',
            ], 502);
        }
    }
}
