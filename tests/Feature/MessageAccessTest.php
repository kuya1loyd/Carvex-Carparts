<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\LocalAuthTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MessageAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_can_read_only_conversations_they_participate_in(): void
    {
        $first = User::factory()->create(['role' => 'customer']);
        $second = User::factory()->create(['role' => 'customer']);
        $outsider = User::factory()->create(['role' => 'customer']);
        $conversation = $this->conversationBetween($first, $second);

        $this->getJson('/api/messages/' . $conversation->id, $this->authHeaders($first))
            ->assertOk();

        $this->getJson('/api/messages/' . $conversation->id, $this->authHeaders($outsider))
            ->assertNotFound();
    }

    public function test_product_message_starts_a_conversation_and_notifies_the_seller(): void
    {
        Notification::fake();

        $buyer = User::factory()->create(['role' => 'customer']);
        $seller = User::factory()->create(['role' => 'customer']);
        $categoryId = \App\Models\Category::create([
            'name' => 'Test Parts',
            'slug' => 'test-parts',
        ])->id;
        $product = \App\Models\Product::create([
            'category_id' => $categoryId,
            'seller_id' => $seller->id,
            'name' => 'Test alternator',
            'slug' => 'test-alternator',
            'brand' => 'CarVex',
            'description' => 'A test listing.',
            'price' => 1250,
            'stock' => 1,
            'is_active' => true,
            'listing_status' => 'approved',
        ]);

        $response = $this->postJson('/api/messages', [
            'product_id' => $product->id,
            'body' => '  Is this part available?  ',
        ], $this->authHeaders($buyer));

        $response->assertCreated()
            ->assertJsonPath('data.message.body', 'Is this part available?')
            ->assertJsonPath('data.conversation.product_id', $product->id);

        $conversation = Conversation::firstOrFail();
        $this->assertSame(1, Message::where('conversation_id', $conversation->id)->count());
        Notification::assertSentTo($seller, \App\Notifications\DirectMessageReceivedNotification::class);
    }

    public function test_admin_inbox_is_available_only_to_admin_accounts(): void
    {
        $participant = User::factory()->create(['role' => 'customer']);
        $otherParticipant = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $conversation = $this->conversationBetween($participant, $otherParticipant);

        $this->getJson('/api/admin/messages/' . $conversation->id, $this->authHeaders($participant))
            ->assertForbidden();

        $this->getJson('/api/admin/messages/' . $conversation->id, $this->authHeaders($admin))
            ->assertOk();
    }

    private function conversationBetween(User $first, User $second): Conversation
    {
        $ids = [(int) $first->id, (int) $second->id];
        sort($ids, SORT_NUMERIC);

        $conversation = Conversation::create([
            'participant_one_id' => $ids[0],
            'participant_two_id' => $ids[1],
            'context_key' => 'general',
        ]);

        $conversation->messages()->create([
            'sender_id' => $first->id,
            'body' => 'Hello',
        ]);

        return $conversation;
    }

    private function authHeaders(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . app(LocalAuthTokenService::class)->issueAccessToken($user),
        ];
    }
}
