<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasFactory, MustVerifyEmailTrait, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'profile_picture',
        'password',
        'role',
        'phone',
        'address',
        'billing_address',
        'shipping_address',
        'payment_method',
        'city',
        'region',
        'region_code',
        'province',
        'barangay',
        'postal_code',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'auth_token_version' => 'integer',
    ];

    /**
     * Check if user is admin
     */
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is customer
     */
    public function isCustomer()
    {
        return $this->role === 'customer';
    }

    /**
     * Relationships
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }

    public function promoCodes()
    {
        return $this->hasMany(PromoCode::class, 'assigned_user_id');
    }

    public function listings()
    {
        return $this->hasMany(Product::class, 'seller_id');
    }

    public function activityLogs()
    {
        return $this->hasMany(UserActivityLog::class);
    }

    public function conversationsAsParticipantOne()
    {
        return $this->hasMany(Conversation::class, 'participant_one_id');
    }

    public function conversationsAsParticipantTwo()
    {
        return $this->hasMany(Conversation::class, 'participant_two_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

}
