<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Models\User;
use App\Notifications\DirectMessageReceivedNotification;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->customer($request);
        if (!$user) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $conversations = Conversation::query()
            ->where(function ($query) use ($user) {
                $query->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->with([
                'participantOne:id,name,profile_picture',
                'participantTwo:id,name,profile_picture',
                'product:id,name,images,price',
                'latestMessage.sender:id,name',
            ])
            ->withCount([
                'messages as unread_count' => fn ($query) => $query
                    ->where('sender_id', '!=', $user->id)
                    ->whereNull('read_at'),
            ])
            ->orderByDesc('last_message_at')
            ->paginate(25);

        return response()->json([
            'message' => 'Conversations retrieved successfully.',
            'data' => $conversations,
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $this->customer($request);
        if (!$user) {
            return response()->json(['unread_count' => 0]);
        }

        $count = Message::query()
            ->whereHas('conversation', function ($query) use ($user) {
                $query->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => (int) $count]);
    }

    public function store(Request $request)
    {
        $user = $this->customer($request);
        if (!$user) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'body' => 'required|string|min:1|max:4000',
        ]);

        $product = Product::query()->with('seller:id,name,profile_picture')
            ->whereKey($validated['product_id'])
            ->where('is_active', true)
            ->first();

        if (!$product || !$product->seller_id || !$product->seller) {
            return response()->json(['message' => 'This listing does not have an available seller.'], 404);
        }

        if ((int) $product->seller_id === (int) $user->id) {
            return response()->json(['message' => 'You cannot start a conversation with yourself.'], 422);
        }

        if ($product->listing_status !== 'approved') {
            return response()->json(['message' => 'This seller listing is not available for messaging.'], 404);
        }

        $seller = $product->seller;
        $participants = [(int) $user->id, (int) $seller->id];
        sort($participants, SORT_NUMERIC);
        $attributes = [
            'participant_one_id' => $participants[0],
            'participant_two_id' => $participants[1],
            'context_key' => 'product:' . $product->id,
        ];

        try {
            $conversation = Conversation::firstOrCreate($attributes, [
                'product_id' => $product->id,
            ]);
        } catch (QueryException $exception) {
            $conversation = Conversation::where($attributes)->first();
            if (!$conversation) {
                throw $exception;
            }
        }

        $message = $this->createMessage($conversation, $user, trim((string) $validated['body']));

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => [
                'conversation' => $conversation->load([
                    'participantOne:id,name,profile_picture',
                    'participantTwo:id,name,profile_picture',
                    'product:id,name,images,price',
                ]),
                'message' => $message->load('sender:id,name'),
            ],
        ], 201);
    }

    public function show(Request $request, int $conversationId)
    {
        $user = $this->customer($request);
        if (!$user) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $conversation = $this->conversationForUser($conversationId, $user);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $conversation->load([
            'participantOne:id,name,profile_picture',
            'participantTwo:id,name,profile_picture',
            'product:id,name,images,price',
        ]);

        return response()->json([
            'message' => 'Conversation retrieved successfully.',
            'data' => [
                'conversation' => $conversation,
                'messages' => $conversation->messages()
                    ->with('sender:id,name,profile_picture')
                    ->orderByDesc('id')
                    ->limit(50)
                    ->get()
                    ->reverse()
                    ->values(),
            ],
        ]);
    }

    public function reply(Request $request, int $conversationId)
    {
        $user = $this->customer($request);
        if (!$user) {
            return response()->json(['message' => 'Customer access required.'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:4000',
        ]);
        $conversation = $this->conversationForUser($conversationId, $user);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $message = $this->createMessage($conversation, $user, trim((string) $validated['body']));

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $message->load('sender:id,name,profile_picture'),
        ], 201);
    }

    public function adminIndex(Request $request)
    {
        $query = Conversation::query()
            ->with([
                'participantOne:id,name,email',
                'participantTwo:id,name,email',
                'product:id,name',
                'latestMessage.sender:id,name',
            ])
            ->orderByDesc('last_message_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->whereHas('participantOne', fn ($users) => $users->where('name', 'like', '%' . $search . '%')->orWhere('email', 'like', '%' . $search . '%'))
                ->orWhereHas('participantTwo', fn ($users) => $users->where('name', 'like', '%' . $search . '%')->orWhere('email', 'like', '%' . $search . '%'));
        }

        return response()->json([
            'message' => 'Conversations retrieved successfully.',
            'data' => $query->paginate(30),
        ]);
    }

    public function adminShow(int $conversationId)
    {
        $conversation = Conversation::query()
            ->with([
                'participantOne:id,name,email',
                'participantTwo:id,name,email',
                'product:id,name',
            ])
            ->find($conversationId);

        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        return response()->json([
            'message' => 'Conversation retrieved successfully.',
            'data' => [
                'conversation' => $conversation,
                'messages' => $conversation->messages()
                    ->with('sender:id,name,email')
                    ->orderByDesc('id')
                    ->limit(100)
                    ->get()
                    ->reverse()
                    ->values(),
            ],
        ]);
    }

    public function adminDestroy(int $conversationId)
    {
        $conversation = Conversation::find($conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted successfully.']);
    }

    private function customer(Request $request): ?User
    {
        $user = $request->user();
        return $user && $user->role === 'customer' ? $user : null;
    }

    private function conversationForUser(int $conversationId, User $user): ?Conversation
    {
        return Conversation::query()
            ->whereKey($conversationId)
            ->where(function ($query) use ($user) {
                $query->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->first();
    }

    private function createMessage(Conversation $conversation, User $sender, string $body): Message
    {
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'body' => $body,
        ]);

        $conversation->forceFill(['last_message_at' => $message->created_at])->save();

        $recipientId = (int) ((int) $conversation->participant_one_id === (int) $sender->id
            ? $conversation->participant_two_id
            : $conversation->participant_one_id);
        $recipient = User::find($recipientId);
        if ($recipient) {
            $recipient->notify(new DirectMessageReceivedNotification($conversation, $message->load('sender')));
        }

        return $message;
    }
}
