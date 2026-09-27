<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class AdminDirectMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $title,
        private string $message,
        private string $link = '/dashboard'
    ) {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $normalizedTitle = trim($this->title) !== '' ? trim($this->title) : 'Message from admin';
        $normalizedMessage = trim($this->message);

        return [
            'kind' => 'admin_message',
            'title' => $normalizedTitle,
            'message' => Str::limit($normalizedMessage, 170),
            'subject' => $normalizedTitle,
            'link' => trim($this->link) !== '' ? trim($this->link) : '/dashboard',
            'status' => 'sent',
            'full_message' => $normalizedMessage,
        ];
    }
}
