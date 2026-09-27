<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderPlacedNotification extends Notification
{
    use Queueable;

    public function __construct(private Order $order)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $orderNumber = $this->order->order_number ?: ('Order #' . $this->order->id);
        $formattedTotal = 'PHP ' . number_format((float) $this->order->total_amount, 2);

        return [
            'kind' => 'order_success',
            'title' => 'Order placed successfully',
            'message' => $orderNumber . ' has been received for ' . $formattedTotal . '. We will process it shortly.',
            'subject' => $orderNumber,
            'order_id' => $this->order->id,
            'order_number' => $orderNumber,
            'link' => '/dashboard/orders',
            'status' => (string) ($this->order->status ?: 'processing'),
        ];
    }
}
