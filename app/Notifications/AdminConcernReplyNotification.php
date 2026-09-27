<?php

namespace App\Notifications;

use App\Models\CustomerConcern;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class AdminConcernReplyNotification extends Notification
{
    use Queueable;

    public function __construct(private CustomerConcern $concern)
    {
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
        $reply = trim((string) $this->concern->admin_reply);
        $subject = trim((string) $this->concern->subject) ?: 'Support ticket';

        return [
            'kind' => 'support_reply',
            'concern_id' => $this->concern->id,
            'title' => 'Admin sent you a support message',
            'message' => Str::limit($subject . ': ' . $reply, 170),
            'subject' => $subject,
            'link' => '/dashboard/support?concern=' . $this->concern->id,
            'status' => $this->concern->status,
            'reply_preview' => Str::limit($reply, 170),
        ];
    }
}
