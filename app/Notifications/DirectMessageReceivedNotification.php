<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class DirectMessageReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private Conversation $conversation,
        private Message $message
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'direct_message',
            'title' => 'New message',
            'message' => Str::limit((string) $this->message->body, 150),
            'conversation_id' => $this->conversation->id,
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->message->sender?->name ?? 'CarVex member',
            'link' => '/dashboard/messages?conversation=' . $this->conversation->id,
        ];
    }
}
