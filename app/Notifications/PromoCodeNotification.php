<?php

namespace App\Notifications;

use App\Models\PromoCode;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PromoCodeNotification extends Notification
{
    use Queueable;

    public function __construct(
        private PromoCode $promoCode,
        private ?string $customTitle = null,
        private ?string $customMessage = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $title = trim((string) $this->customTitle) !== '' ? trim((string) $this->customTitle) : 'New promo code from CarVex';
        $discountLabel = $this->promoCode->discount_type === 'percentage'
            ? rtrim(rtrim(number_format((float) $this->promoCode->discount_value, 2), '0'), '.') . '% off'
            : 'PHP ' . number_format((float) $this->promoCode->discount_value, 2) . ' off';

        $promoSummary = 'Use code ' . $this->promoCode->code . ' for ' . $discountLabel;

        if ((float) $this->promoCode->minimum_order_amount > 0) {
            $promoSummary .= ' on orders from PHP ' . number_format((float) $this->promoCode->minimum_order_amount, 2);
        }

        if ($this->promoCode->expires_at) {
            $promoSummary .= '. Valid until ' . $this->promoCode->expires_at->format('M j, Y g:i A');
        } else {
            $promoSummary .= '.';
        }

        $customMessage = trim((string) $this->customMessage);
        $message = $customMessage !== '' ? ($customMessage . ' ' . $promoSummary) : $promoSummary;

        return [
            'kind' => 'promo_code',
            'title' => $title,
            'message' => $message,
            'full_message' => $message,
            'subject' => $this->promoCode->code,
            'promo_code' => $this->promoCode->code,
            'discount_type' => $this->promoCode->discount_type,
            'discount_value' => (float) $this->promoCode->discount_value,
            'minimum_order_amount' => (float) $this->promoCode->minimum_order_amount,
            'expires_at' => optional($this->promoCode->expires_at)->toISOString(),
            'link' => '/dashboard/cart?promo=' . urlencode($this->promoCode->code),
            'status' => $this->promoCode->is_active ? 'active' : 'inactive',
        ];
    }
}
